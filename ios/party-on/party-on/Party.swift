//
//  Party.swift
//  party-on
//
//  Created by Maxwell McLennan on 8/31/15.
//  Copyright (c) 2015 Maxwell McLennan. All rights reserved.
//

import UIKit
import CoreLocation
import SwiftyJSON

class Party: NSObject, ServerModel {
    var oID: String?// required
    var formattedAddress: String!// required
    var location: CLLocationCoordinate2D!// required
    var maleCost: UInt = 0// required - default 0
    var femaleCost: UInt = 0// required - default 0
    var startTime: NSDate!// required
    var byob: Bool = true// required default true
    var theWord: [TheWordMessage] = []// required
    
    var colloquialName: String?// optional
    var descrip: String?// optional - 256 char max
    
    var endTime: NSDate?
    
    override init() {
        super.init()
    }
    
    required init(json: JSON) {
        // required properties
        self.oID = json["_id"].stringValue
        self.formattedAddress = json["formattedAddress"].stringValue
        
        let latitude = CLLocationDegrees(json["latitude"].number!.doubleValue)
        let longitude = CLLocationDegrees(json["longitude"].number!.doubleValue)
        self.location = CLLocationCoordinate2DMake(latitude, longitude)
        
        self.maleCost = json["maleCost"].number!.unsignedLongValue
        self.femaleCost = json["femaleCost"].number!.unsignedLongValue
        self.byob = json["byob"].boolValue
        
        self.startTime = NSDate(timeIntervalSince1970: json["startTime"].number!.doubleValue / 1000)
        
        for wordJson in json["theWord"].arrayValue {
            self.theWord.append(TheWordMessage(json: wordJson))
        }
        
        // optional properties
        if let colloquialName = json["colloquialName"].string {
            self.colloquialName = colloquialName
        }
        if let description = json["description"].string {
            self.descrip = description
        }
        
        super.init()
        
        if let endTime = json["endTime"].number {
            self.endTime = NSDate(timeIntervalSince1970: json["endTime"].number!.doubleValue / 1000)
        }
        
        
        return
        let dummyMessages = [
            "Nothing yet",
            "Heating up",
            "They ran out of alcohol alks jsad nweo rinqw inwe roqm wnr oi wenrio wrn n iow ernqo wer oiw enro qew",
            "Great keg just got here"
        ]
        for (idx, message) in enumerate(dummyMessages) {
            let msgCount = count(message)
            self.theWord.append(TheWordMessage(oID: "", body: message, created: NSDate(timeIntervalSinceNow: NSTimeInterval(60 * 60 * (idx - msgCount - msgCount)))))
        }
    }
    
    convenience init(oID: String, formattedAddress: String, location: CLLocationCoordinate2D, startTime: NSDate, endTime: NSDate?, maleCost: UInt, femaleCost: UInt, byob: Bool, colloquialName: String?, description: String?) {
        self.init()
        self.oID = oID
        self.formattedAddress = formattedAddress
        self.location = location
        self.startTime = startTime
        self.maleCost = maleCost
        self.femaleCost = femaleCost
        self.byob = byob
        self.colloquialName = colloquialName
        self.descrip = description
        self.endTime = endTime
    }
    
    func toJSON() -> JSON {
        var json = JSON([
            "formattedAddress": formattedAddress,
            "latitude": location.latitude,
            "longitude": location.longitude,
            "startTime": startTime.timeIntervalSince1970 * 1000,
            "maleCost": maleCost,
            "femaleCost": femaleCost,
            "byob": byob,
            "university": University.currentUniversity.name
        ])
        if let oid = self.oID {
            json["_id"] = JSON(oid)
        }
        if let colloquial = colloquialName {
            json["colloquialName"] = JSON(colloquial)
        }
        if let description = descrip {
            json["description"] = JSON(description)
        }
        if let end = endTime {
            json["endTime"] = JSON(end.timeIntervalSince1970 * 1000)
        }
        
        return json
    }
}