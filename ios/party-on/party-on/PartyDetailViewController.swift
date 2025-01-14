//
//  PartyDetailViewController.swift
//  party-on
//
//  Created by Maxwell McLennan on 8/31/15.
//  Copyright (c) 2015 Maxwell McLennan. All rights reserved.
//

import UIKit
import MapKit
import MessageUI
import SVProgressHUD

public let OK_EMOJI: Character = "\u{1F44C}"
public let THUMBS_DOWN_EMOJI: Character = "\u{1F44E}"

// Receives a signal when one particular party changed
protocol SinglePartyDidChangeResponder: class {
    func singlePartyDidChange(party: Party)
}

class PartyDetailViewController: UIViewController, MFMessageComposeViewControllerDelegate, UITableViewDataSource, UITableViewDelegate, UIAlertViewDelegate, CreateEditPartyViewControllerDelegate {
    
    @IBOutlet weak var addressButton: UIButton?
    @IBOutlet weak var textFriendButton: UIButton?
    @IBOutlet weak var providedBoolLabel: UILabel?
    @IBOutlet weak var guysPayLabel: UILabel?
    @IBOutlet weak var girlsPayLabel: UILabel?
    @IBOutlet weak var startsLabel: UILabel?
    @IBOutlet weak var theWordTableView: UITableView?
    @IBOutlet weak var dayLabel: UILabel?
    
    // Optional Fields
    @IBOutlet weak var endsLabel: UILabel?
    @IBOutlet weak var endsLabelLabel: UILabel?
    @IBOutlet weak var descriptionLabel: UILabel?
    @IBOutlet weak var descriptionTextView: UITextView?
    
    weak var singlePartyDidChangeResponder: SinglePartyDidChangeResponder?
    
    var _party: Party!
    var party: Party! {
        get {
            return _party
        } set(val) {
            _party = val
            
            // Fill in Party data
            self.navigationItem.title = _party.formattedAddress
            self.providedBoolLabel?.text = _party.byob ? "BYO" : "PROVIDED"
            self.party.maleCost == 0;
            self.guysPayLabel?.text = _party.maleCost != 0 ? "$" + String(_party.maleCost) : "FREE"
            self.girlsPayLabel?.text = _party.femaleCost != 0 ? "$" + String(_party.femaleCost) : "FREE"
            self.dayLabel?.text = _party.startDay
            
            
            let timeFormatter = NSDateFormatter()
            timeFormatter.timeZone = NSTimeZone.systemTimeZone()
            timeFormatter.timeStyle = NSDateFormatterStyle.ShortStyle
            self.startsLabel?.text = timeFormatter.stringFromDate(_party.startTime)
            
            // update The Word
            self.theWordTableView?.reloadData()
            self.scrollToTheWordBottom(true)
        }
    }
    
    
    private var wordTimeLabelHeight: CGFloat?
    private var refreshPartyTimer: NSTimer?

    override func viewDidLoad() {
        super.viewDidLoad()
        self.theWordTableView?.dataSource = self
        self.theWordTableView?.delegate = self
        scrollToTheWordBottom(false)
        
        scheduleRefreshParty()
        
        // Navigation Item Title
        self.navigationItem.title = party.formattedAddress
        
        var navigationBarTextAttrs: [String: AnyObject] = [:]
        if let smallCourier = UIFont(name: "AmericanTypewriter", size: 15) {
            navigationBarTextAttrs[NSFontAttributeName] = smallCourier
        }
        self.navigationController?.navigationBar.titleTextAttributes = navigationBarTextAttrs
        
        // Determine which right bar button item to use
        print("PartyDetailViewController comparing storied id \(MainUser.storedUserId) to party's id \(self.party.userId)")
        if MainUser.storedUserId != nil && MainUser.storedUserId == self.party.userId {
            // MainUser made this party
            self.navigationItem.rightBarButtonItem = UIBarButtonItem(barButtonSystemItem: .Edit, target: self, action: "editPartyButtonClick")
        } else {
            // This is someone else's party, flag
            let flagImage = UIImage(named: "grayed_white_flag_icon.png")
            let flagImageView = UIImageView(frame: CGRectMake(8, 8, 36, 36))
            flagImageView.image = flagImage
            flagImageView.contentMode = UIViewContentMode.ScaleAspectFit
            flagImageView.alpha = 0.8
            flagImageView.addGestureRecognizer(UITapGestureRecognizer(target: self, action: "flagTapped"))
            self.navigationItem.rightBarButtonItem = UIBarButtonItem(customView: flagImageView)
        }
        
        let now = NSDate(timeIntervalSinceNow: 0)
        if now.timeIntervalSince1970 < party.startTime.timeIntervalSince1970 {
            // party is in the future
        } else {
            // party is in the past
        }
        
        //if let endTime = self.party.endTime {
        if false {
            //self.endsLabel?.text = timeFormatter.stringFromDate(endTime)
        } else {
            self.endsLabel?.hidden = true
            self.endsLabelLabel?.hidden = true
        }
        
        //if let description = self.party.descrip {
        if false {
            //self.descriptionTextView?.text = description
        } else {
            self.descriptionTextView?.hidden = true
            self.descriptionLabel?.hidden = true
        }
        
        // force triggering of party population
        self.party = _party
    }
    
    override func viewWillAppear(animated: Bool) {
        super.viewWillAppear(animated)
        self.navigationController?.navigationBar.hidden = false
        if let appDelegate = UIApplication.sharedApplication().delegate as? AppDelegate {
            appDelegate.partyDetailControllerInFocus = self
        }
    }
    
    override func viewWillDisappear(animated: Bool) {
        super.viewWillDisappear(animated)
        self.descheduleRefreshParty()
        if let appDelegate = UIApplication.sharedApplication().delegate as? AppDelegate {
            appDelegate.partyDetailControllerInFocus = nil
        }
    }

    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
        // Dispose of any resources that can be recreated.
    }
    
    
    // MARK: - Navigation

    // In a storyboard-based application, you will often want to do a little preparation before navigation
    override func prepareForSegue(segue: UIStoryboardSegue, sender: AnyObject?) {
        super.prepareForSegue(segue, sender: sender)
        if segue.identifier == editPartySegueIdentifier {
            let editPartyController = segue.destinationViewController as! CreateEditPartyViewController
            self.descheduleRefreshParty()
            editPartyController.delegate = self
            editPartyController.method = .PUT
            editPartyController.party = self.party
        }
    }
    
    
    // Mark: - Flagging
    
    func flagTapped() {
        let flagDialog = UIAlertController(title: "Report Abuse", message: "If this posting got out of hand, or if the party got kind of scary, leave us a message and we'll take a look at it", preferredStyle: UIAlertControllerStyle.Alert)
        
        flagDialog.addTextFieldWithConfigurationHandler { (textField: UITextField!) -> Void in
            textField.autocapitalizationType = .Sentences
        }
        
        flagDialog.addAction(UIAlertAction(title: "Report", style: UIAlertActionStyle.Destructive, handler: { (action: UIAlertAction) -> Void in
            self.sendFlagRequest(flagDialog.textFields?.first?.text)
            flagDialog.dismissViewControllerAnimated(true, completion: nil)
        }))
        
        flagDialog.addAction(UIAlertAction(title: "Cancel", style: UIAlertActionStyle.Default, handler: { (action: UIAlertAction) -> Void in
            flagDialog.dismissViewControllerAnimated(true, completion: nil)
        }))
        
        self.presentViewController(flagDialog, animated: true, completion: nil)
    }
    
    private func sendFlagRequest(complaint: String?) {
        let displayErrorDialog = { () -> Void in
            UIAlertView(title: "Oh no", message: "Failed to flag this party. Try again another time.", delegate: nil, cancelButtonTitle: "Ok").show()
        }
        if self.party.oID == nil {
            // doon't seg fault for lack of oID, it's not worth the risk
            return displayErrorDialog()
        }
        
        SVProgressHUD.showAndBlockInteraction(self.view)
        PartiesDataStore.sharedInstance.flag(self.party.oID!, complaint: complaint) { (err: NSError?) -> Void in
            SVProgressHUD.dismissAndUnblockInteraction(self.view)
            
            if err == nil {
                UIAlertView(title: "Thanks for keeping watch", message: "We'll take a look at this party and remove it if need be", delegate: nil, cancelButtonTitle: "Ok").show()
            } else {
                displayErrorDialog()
            }
        }
    }
    
    
    // MARK: - MFMessageComposeViewControllerDelegate methods
    
    func messageComposeViewController(controller: MFMessageComposeViewController, didFinishWithResult result: MessageComposeResult) {
        controller.dismissViewControllerAnimated(true, completion: { () -> Void in
            if result.rawValue == MessageComposeResultFailed.rawValue {
                UIAlertView(title: "Oh no!", message: "Message failed to send", delegate: nil, cancelButtonTitle: "Ok").show()
            }
            // presenting this controller stopped refreshing the party, restart
            self.scheduleRefreshParty()
        })
    }
    
    
    // MARK: - UIAlertViewDelegate methods
    
    func alertView(alertView: UIAlertView, clickedButtonAtIndex buttonIndex: Int) {
        if buttonIndex == 0 {
            // Send button
            if let alertTextField = alertView.textFieldAtIndex(0) {
                if alertTextField.text != nil && alertTextField.text!.characters.count > 0 {
                    let newWord = TheWordMessage(oID: nil, body: alertTextField.text!, created: NSDate(timeIntervalSinceNow: 0))
                    PartiesDataStore.sharedInstance.sendword(newWord, party: self.party, callback: { (err, party) -> Void in
                        if err == nil {
                            // reload TheWord locally
                            self.party = party
                            print("\(self.party!.theWord.count) msgs in party word")
                        } else {
                            UIAlertView(title: "Uh-oh", message: "Had trouble sending message", delegate: nil, cancelButtonTitle: "Ok").show()
                        }
                    })
                }
            }
        } else {
            // Cancel button
            alertView.dismissWithClickedButtonIndex(buttonIndex, animated: true)
        }
    }
    
    func alertViewCancel(alertView: UIAlertView) {
        // WARN: - Because of the way I hacked this AlertView, it won't call alertViewCancel correctly. Don't use it.
    }
    
    
    // MARK: - Generic Selectors
    
    @IBAction func addressButtonClick(sender: AnyObject?) {
        let latLongString = String(format: "http://maps.apple.com/?q=%f,%f", self.party.location.latitude, self.party.location.longitude)
        UIApplication.sharedApplication().openURL(NSURL(string: latLongString)!)
        
        /* Use this if you want to open a MapView within the app instead of in Maps
        
        let mapViewController = ModalMapViewController()
        let partyPoint = PartyAnnotation(party: self.party!)
        mapViewController.annotations = [partyPoint]
        self.presentViewController(mapViewController, animated: true, completion: nil)*/
        
    }
    
    @IBAction func sendTextMessageButtonClick(sender: AnyObject?) {
        if MFMessageComposeViewController.canSendText() {
            let textController = MFMessageComposeViewController()
            textController.messageComposeDelegate = self
            textController.body = self.party.formattedAddress
            self.presentViewController(textController, animated: true, completion: nil)
        } else {
            UIAlertView(title: "Can't send message", message: "Looks like your phone isn't configured to send text messages", delegate: nil, cancelButtonTitle: "Ok").show()
        }
    }
    
    /* schedule a timer to periodically refresh the party */
    func scheduleRefreshParty() {
        if self.refreshPartyTimer == nil {
            print("scheduling refresh party")
            self.refreshPartyTimer = NSTimer.scheduledTimerWithTimeInterval(refreshPartyTimeInterval, target: self, selector: "refreshParty", userInfo: nil, repeats: true)
            self.refreshPartyTimer?.fire()
        }
    }
    
    /* kill the timer that is refreshing the party */
    func descheduleRefreshParty() {
        print("descheduling refresh party")
        self.refreshPartyTimer?.invalidate()
        self.refreshPartyTimer = nil
    }
    
    /* Refresh the data for this party and its entry in the PartiesDataStore */
    func refreshParty() {
        print("refresh party")
        if let myPartyId = self.party.oID {
            PartiesDataStore.sharedInstance.getParty(myPartyId, callback: { (err, party) -> Void in
                if err == nil {
                    self.party = party
                }
            })
        }
    }
    
    
    // MARK: - UITableViewDataSource
    
    func tableView(tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return self.party.theWord.count + 1
    }
    
    func tableView(tableView: UITableView, cellForRowAtIndexPath indexPath: NSIndexPath) -> UITableViewCell {
        var cell: UITableViewCell
        
        if let message = theWordForRowAtIndexPath(indexPath, tableView: tableView) {
            let wordCell: TheWordTableViewCell = tableView.dequeueReusableCellWithIdentifier(theWordReadCellReuseIdentifier, forIndexPath: indexPath) as! TheWordTableViewCell
            wordCell.bodyLabel?.text = message.body
            
            let timeFormatter = NSDateFormatter()
            timeFormatter.dateFormat = "h:mm a"
            wordCell.dateLabel?.text = timeFormatter.stringFromDate(self.party.theWord[indexPath.row].created)
            
            if let wordCellTimeHeight = wordCell.dateLabel?.frame.height {
                self.wordTimeLabelHeight = wordCellTimeHeight
            }
            
            cell = wordCell
        } else {
            // last row in the table
            cell = tableView.dequeueReusableCellWithIdentifier(theWordWriteCellReuseIdentifier, forIndexPath: indexPath) 
        }
        return cell
    }
    
    
    // MARK: - UITableViewDelegate
    
    func tableView(tableView: UITableView, heightForRowAtIndexPath indexPath: NSIndexPath) -> CGFloat {
        var text: String
        if let message = theWordForRowAtIndexPath(indexPath, tableView: tableView) {
            text = message.body
        } else {
            // last row in table
            text = ""
        }
        
        let width = tableView.frame.width
        
        let font = UIFont.systemFontOfSize(16)
        
        let attributedString = NSAttributedString(string: text, attributes: [NSFontAttributeName: font])
        let boundingRect = attributedString.boundingRectWithSize(CGSizeMake(width, CGFloat.max), options: NSStringDrawingOptions.UsesLineFragmentOrigin, context: nil)

        var timeLabelHeight: CGFloat
        if let h = wordTimeLabelHeight {
            timeLabelHeight = h
        } else {
            timeLabelHeight = minTheWordDateLabelHeight
        }
        return max(ceil(boundingRect.height) + timeLabelHeight, minTheWordCellHeight)
    }
    
    func tableView(tableView: UITableView, didSelectRowAtIndexPath indexPath: NSIndexPath) {
        if theWordForRowAtIndexPath(indexPath, tableView: tableView) == nil {
            // Dealing with the create comment cell
            tableView.deselectRowAtIndexPath(indexPath, animated: true)
            launchSendMessageDialog()
        }
    }
    
    
    // MARK: CreateEditPartyViewControllerDelegate
    
    func createEditPartyDidCancel(viewController: CreateEditPartyViewController) {
        viewController.dismissViewControllerAnimated(true, completion: { () -> Void in
            self.scheduleRefreshParty()
        })
    }
    
    func createEditPartyDidSucceed(viewController: CreateEditPartyViewController, party: Party, method: CreateEditPartyActionType) {
        self.party = party
        viewController.dismissViewControllerAnimated(true, completion: { () -> Void in
            self.scheduleRefreshParty()
            self.singlePartyDidChangeResponder?.singlePartyDidChange(party)
        })
    }
    
    
    // MARK: Helpers
    
    private func theWordForRowAtIndexPath(indexPath: NSIndexPath, tableView: UITableView) -> TheWordMessage? {
        if indexPath.row == tableView.dataSource!.tableView(tableView, numberOfRowsInSection: indexPath.row) - 1 {
            // last row in table
            return nil
        } else {
            return self.party.theWord[indexPath.row]
        }
    }
    
    private func launchSendMessageDialog() {
        // launch an alert view for sending a message
        let dialog = UIAlertView(title: "Spread the word", message: "What's going on at this party?", delegate: self, cancelButtonTitle: "Send", otherButtonTitles: "Nevermind")
        dialog.alertViewStyle = UIAlertViewStyle.PlainTextInput
        dialog.textFieldAtIndex(0)?.autocapitalizationType = .Sentences
        dialog.show()
    }
    
    private func scrollToTheWordBottom(animated: Bool) {
        if let theWordTableView = self.theWordTableView {
            let bottomSection = theWordTableView.numberOfSections - 1
            let bottomCell = theWordTableView.numberOfRowsInSection(bottomSection) - 1
            theWordTableView.scrollToRowAtIndexPath(NSIndexPath(forRow: bottomCell, inSection: bottomSection), atScrollPosition: UITableViewScrollPosition.Bottom, animated: animated)
        }
    }
    
    func editPartyButtonClick() {
        self.performSegueWithIdentifier(editPartySegueIdentifier, sender: self)
    }
    
    
    // MARK: Primitive Constants
    
    private let theWordReadCellReuseIdentifier = "TheWordReadCell"
    private let theWordWriteCellReuseIdentifier = "TheWordWriteCell"
    private let editPartySegueIdentifier = "EditPartySegue"
    private let minTheWordCellHeight: CGFloat = 44
    private let minTheWordDateLabelHeight: CGFloat = 12
    private let refreshPartyTimeInterval: NSTimeInterval = 10
}



