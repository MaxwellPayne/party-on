package receive;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Bundle;
import android.os.Parcel;
import android.util.Log;
import android.widget.CheckBox;
import android.widget.ListView;
import android.widget.TextView;

import net.john.partyon.R;

import java.util.Date;

import exceptions.PartyNotFoundException;
import models.Party;

/**
 * Created by John on 9/1/2015.
 */
public class ViewPartyActivity extends Activity {
    String party_extra_name;
    private Party mParty;

    private TextView mTv_title;
    private TextView mTv_readable_loc;
    private TextView mTv_desc;
    private TextView mTv_starts_at;
    private TextView mTv_ends_at;
    private TextView mTv_gendered_prices;
    private CheckBox mCb_byob;
    private TextView mWordTitleTv;

    private ListView mWordLv;

    public void onCreate(Bundle saved_instance){
        super.onCreate(saved_instance);
        setContentView(R.layout.activity_fullscreen_party_list_item);

        //set views by R.id
        //mTv_title = (TextView) findViewById(R.id.fullscreen_party_item_title);
        mTv_readable_loc = (TextView) findViewById(R.id.fullscreen_party_item_readable_loc);
        //mTv_desc = (TextView) findViewById(R.id.fullscreen_party_item_desc);
        mTv_starts_at = (TextView) findViewById(R.id.fullscreen_party_item_starts_at);
        //mTv_ends_at = (TextView) findViewById(R.id.fullscreen_party_item_ends_at);
        mTv_gendered_prices = (TextView) findViewById(R.id.fullscreen_party_item_gendered_prices);
        mCb_byob = (CheckBox) findViewById(R.id.fullscreen_party_item_byob);
        mWordTitleTv = (TextView) findViewById(R.id.the_word_title);

        //set the Typeface
        Typeface mPg99Typeface = Typeface.createFromAsset(getAssets(),
                getResources().getString(R.string.typeface_stylish));
        //TODO make this programmatic after testing
        mTv_readable_loc.setTypeface(mPg99Typeface);
        mTv_starts_at.setTypeface(mPg99Typeface);
        //mTv_ends_at.setTypeface(mPg99Typeface);
        mTv_gendered_prices.setTypeface(mPg99Typeface);
        mWordTitleTv.setTypeface(mPg99Typeface);
        try {
            getPartyFromExtra();
            fillViewFromParty();
        } catch (PartyNotFoundException ex){
            ex.printStackTrace();
        }
    }

    private void getPartyFromExtra() throws PartyNotFoundException{
        party_extra_name = getResources().getString(R.string.party_extra_name);
        Intent intent = getIntent();
        if (intent == null) throw new PartyNotFoundException(this);

        //returns Parcelable, so typecast
        mParty = intent.getParcelableExtra(party_extra_name);
        if (mParty == null){
            Log.d("party_detail", "party is null");
        }
        Log.d("party_detail", mParty.toString());
    }

    private void fillViewFromParty(){
        //all of these fields are required by the model and therefore will be shown
        //mTv_title.setText(mParty.getTitle());
        //mTv_readable_loc.setText(getResources().getString(R.string.submit_form_loc_title) + mParty.getformatted_address());
        mTv_desc.setText(getResources().getString(R.string.submit_form_desc_title) + mParty.getDesc());

        //format time
        Date mDate_starts_at = new Date(mParty.getStart_time());
        String day = (mDate_starts_at.getDate() == (new Date(System.currentTimeMillis()).getDate())) ? "Today" : "Tomorrow";
        int time = mDate_starts_at.getHours();
        String timeText = (time > 12) ? time + "AM" : (time % 12) + "PM";
        Date mDate_ends_at = new Date(mParty.getEnds_at());
        mTv_starts_at.setText("Starts " + day +  " at " + time);
        //mTv_ends_at.setText(getResources().getString(R.string.submit_form_ends_at_title) + mDate_ends_at.toString());
        mTv_gendered_prices.setText(getResources().getString(R.string.submit_form_male_price_title)
            + "$" +  mParty.getMale_cost() + " / " + getResources().getString(R.string.submit_form_female_price_title)
            + "$" + mParty.getFemale_cost());
        mCb_byob.setChecked(mParty.isByob());

        //set the adapter to fill TheWord
        mWordLv = (ListView) findViewById(R.id.the_word_cont);
        mWordLv.setAdapter(new ListWordAdapter(this, mParty.getTheWord()));

        Log.d("receive", "WordAdapter can see " + mWordLv.getAdapter().getCount());
    }

    public Party getParty(){
        return mParty;
    }

    private void launchLocUri(String readable_loc){
        //TODO parse this correctly
        Intent intent = new Intent(android.content.Intent.ACTION_VIEW,
                Uri.parse("google.navigation:q=an+address+city"));
    }

    public String parseStringForUri(String raw){
        raw.replaceAll(" ", "+");
        while (raw.substring(0, 1).equals("+")){
            raw = raw.substring(1, raw.length());
        }
        while (raw.substring(raw.length() - 2, raw.length() - 1).equals("+")){
            raw = raw.substring(1, raw.length() - 2);
        }
        return raw;
    }
}