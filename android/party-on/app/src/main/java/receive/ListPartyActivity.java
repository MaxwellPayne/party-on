package receive;

import android.app.ListActivity;
import android.os.Bundle;
import android.util.Log;
import android.widget.ListView;

import net.john.partyon.R;

import java.util.ArrayList;

import models.Party;

/**
 * Created by John on 8/31/2015.
 */
public class ListPartyActivity extends ListActivity {
    final String DUMMY_FILENAME = "dummy.json";
    private ListView list;
    private ArrayList<Party> mParty_list;
    private ListPartyAdapter mListPartyAdapter;

    @Override
    public void onCreate(Bundle saved_instance){
        super.onCreate(saved_instance);
        setContentView(R.layout.party_list);
        list = (ListView) findViewById(android.R.id.list);
        Log.d("receive", "list to string = " + list.toString());

        //used only for testing w/o server
        DummyReader mDummy_reader = new DummyReader(DUMMY_FILENAME, this);
        mParty_list = new ArrayList<Party>(mDummy_reader.getPartyList());
        Log.d("receive", "party_list length is " + mParty_list.size());

        //set the adapter to propagate list from party_list
        mListPartyAdapter = new ListPartyAdapter(getApplicationContext(), mParty_list);
        list.setAdapter(mListPartyAdapter);
    }

    public ListPartyAdapter getListAdapter(){
        return mListPartyAdapter;
    }
}