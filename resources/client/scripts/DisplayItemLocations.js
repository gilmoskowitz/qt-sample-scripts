/*
 * This file is part of the xTuple ERP: PostBooks Edition, a free and
 * open source Enterprise Resource Planning software suite,
 * Copyright (c) 1999-2012 by OpenMFG LLC, d/b/a xTuple.
 * It is licensed to you under the Common Public Attribution License
 * version 1.0, the full text of which (including xTuple-specific Exhibits)
 * is available at www.xtuple.com/CPAL.  By using this software, you agree
 * to be bound by its terms.
 */
/* This QtScript example shows the basic scripting required to make a simple
   window designed with Qt Designer and imported into an xTuple ERP database
   do the following things:
   - close the window when the user clicks on a Close button
   - query the database and display the data on-screen
   - print a report

   The window contains the following widgets on it:
   _group   a WarehouseGroup which lets user choose either a single warehouse
            or all warehouses
   _list    an XTreeWidget to display the resulting data in tabular form
   _update  an XCheckBox with which the user can request automatic updates
   _close   -
   _query    } QPushButtons to perform the obvious
   _print   -
*/

/*
   The _group widget lets the user choose selection criteria for the query.
   The getParams() function checks the _group widget and creates a parameter
   object to hold the selection criteria. This behaves much like an OpenRPT
   ParameterList object in C++ for passing data to a MetaSQL query.
   The getParams() function is called by query() and print() below.
*/
function getParams()
{
  // create an object to hold the parameters
  var params = new Object;

  /* ask the _group object on the current window if it "isSelected()".
     this is a Q_INVOKABLE method of the WarehouseGroup - see
     widgets/warehousegroup.h in the C++ source tree.
  */
  if(mywindow.findChild("_group").isSelected())
  {
    // create a parameter named "warehous_id" and give it the "id()"
    // this is another Q_INVOKABLE method of the WarehouseGroup 
    //- see widgets/warehousgroup.h
    params.warehous_id = mywindow.findChild("_group").id();
  }

  // hand the parameter list back to the caller
  return params;
}

// Now define a query, run it, and populate the _list with the results.
function query()
{
  var params = getParams();     // get selection criteria from the window

  /* Execute a MetaSQL statement, passing it parameters and saving the result
     set in a variable named 'qry'. The first column in the query should be an
     id column and /every/ column should be named.
     In addition to the list of data columns to display, the query contains
     several special columns that tell _list how to format some of the data.
  */
  var qry = toolbox.executeQuery("SELECT"
        +" location_id, "
        +" warehous_code, "
        +" item_number, "
        +" CASE WHEN (location_aisle || '-' || location_rack || '-' || location_bin || '-' || location_name) IS NULL THEN"
        +"      itemsite_location_comments"
        +"      ELSE location_aisle || '-' || location_rack || '-' || location_bin || '-' || location_name"
        +" END AS location_name,"
        +" formatlotserialnumber(itemloc_ls_id) AS lsnumber,"
        +" itemloc_qty, "
        +" itemloc_expiration," 
        // Now the formatting columns; search for XTreeWidget on the xTuple Wiki
        +" CASE WHEN ((itemloc_expiration<=startOfTime())"
        +"         OR (itemloc_expiration >= endOfTime())) THEN"
        +"    'N/A'"                                // important: no ELSE here!
        +" END AS itemloc_expiration_qtdisplayrole,"
        +" CASE WHEN (itemloc_expiration < CURRENT_DATE) THEN"
        +"  'expired'"               // use the 'expired' color for old itemlocs
        +" END AS itemloc_expiration_qtforegroundrole," // no ELSE here, either
        +" 'qty' AS itemloc_qty_xtnumericrole " // use locale setting for 'qty's
        +" FROM item,   warehous, itemsite"
        +"   LEFT OUTER JOIN itemloc  ON (itemloc_itemsite_id = itemsite_id)"
        +"   LEFT OUTER JOIN location ON (itemloc_location_id = location_id)"
        +" WHERE ((itemsite_item_id = item_id)"
        // restrict but only if the user selected a single warehouse with _group
        +" <? if exists('warehous_id') ?> "
        +"   and (itemsite_warehous_id = <? value('warehous_id') ?>)"
        +" <? endif ?> "
        +"   and (itemsite_warehous_id = warehous_id) "
        +"   and (itemsite_loccntrl = 't' or itemsite_controlmethod = 'L')      )  "
        +" order by warehous_code, item_number, itemloc_expiration,"
        +"          location_name, itemloc_qty;", params);

  // populate the _list XTreeWidget with the query results saved in qry.
  mywindow.findChild("_list").populate(qry);
}

/* Call OpenRPT to print a report. Make sure the main query in the report is
   similar to the query above or the user is going to be very surprised.
*/
function print()
{
  // Call the named report and pass it the same parameters used by query().
  toolbox.printReport("ItemLocationsByWarehouse", getParams());
}

/* This function checks whether the _update widget is checked or not. If
   _update is checked when tick() gets called then it will repopulate _list.
*/
function tick()
{
  if (mywindow.findChild("_update").checked)
  {
    query();
  }
}

/* Now we have to set up the display and connect the various objects together
   in a way that will make the display work when users click the buttons.

   First connect the buttons to the appropriate functions.  Windows know how to
   close themselves so connect the _close button to the generic close function.
*/
mywindow.findChild("_close").clicked.connect(mywindow, "close");

// connect the _query and _print buttons to the functions defined above
mywindow.findChild("_query").clicked.connect(query);
mywindow.findChild("_print").clicked.connect(print);

/* xTuple ERP has an internal repeating timer. Connect the tick() function to
   this timer so the _list gets updated automatically if the user so desires.
*/
mainwindow.tick.connect(tick);

/* When _list gets created by the window, it is empty - no rows and no columns.
   Define the columns here and let query() create the rows. addColumn() takes
   the following arguments:
   1) column title text
   2) column width in pixels
   3) default column alignment - see the Qt docs for Qt::Alignment
   4) default visibility - is this column visible when the window is first shown
   5) column name from the query to put in this column of the display
*/
var list = mywindow.findChild("_list");

list.addColumn("WHSE",               75, 1, true, "warehous_code");
list.addColumn("Item",              115, 1, true, "item_number");
list.addColumn("Location",           90, 1, true, "location_name");
list.addColumn("Lot/Serial Number", 115, 1, true, "lsnumber")
list.addColumn("Loc. Qty",           65, 2, true, "itemloc_qty")
list.addColumn("Expiration",         90, 1, true, "itemloc_expiration");

// and that's it
