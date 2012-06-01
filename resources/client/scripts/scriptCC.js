/*
 * This file is part of the xTuple ERP: PostBooks Edition, a free and
 * open source Enterprise Resource Planning software suite,
 * Copyright (c) 1999-2012 by OpenMFG LLC, d/b/a xTuple.
 * It is licensed to you under the Common Public Attribution License
 * version 1.0, the full text of which (including xTuple-specific Exhibits)
 * is available at www.xtuple.com/CPAL.  By using this software, you agree
 * to be bound by its terms.
 */
mywindow.findChild("_close").clicked.connect(mywindow, "close");

var _amount   = mywindow.findChild("_amount");
var _card     = mywindow.findChild("_card");
var _ccp      = toolbox.getCreditCardProcessor();
var _cust     = mywindow.findChild("_cust");
var _cvv      = mywindow.findChild("_cvv");
var _newTrans = mywindow.findChild("_newTrans");
var _order    = mywindow.findChild("_order");
var _oldTrans = mywindow.findChild("_oldTrans");
var _prior    = mywindow.findChild("_prior");

var _ccptest = _ccp.testConfiguration();
if (_ccptest < 0)
  QMessageBox.critical(mainwindow, qsTr("Configuration Error"),   _ccp.errorMsg());
else if (_ccptest > 0)
  QMessageBox.warning( mainwindow, qsTr("Configuration Warning"), _ccp.errorMsg());

_card.addColumn("Card Number", -1, 1, true, "f_number");
_card.addColumn("Card Type",   -1, 1, true, "type");
_card.addColumn("Expires",     -1, 1, true, "expiration");

_prior.addColumn("Cust. #",     -1, 1, true, "cust_number");                                                                
_prior.addColumn("Name",        -1, 1, true, "cust_name");
_prior.addColumn("Type",        -1, 1, true, "type");
_prior.addColumn("Transaction", -1, 1, true, "status");
_prior.addColumn("Order-Seq.",  -1, 2, true, "docnumber");
_prior.addColumn("Amount",      -1, 2, true, "ccpay_amount");
_prior.addColumn("Currency",    -1, 1, true, "ccpay_currAbbr");

function newCustomer()
{
  if (_cust.id() == -1)
  {
    _newTrans.enabled = false;
    _oldTrans.checked = true;
  }
  else
  {
    _newTrans.enabled = true;
    _newTrans.checked = true;
  }
  populateCard();
  populatePrior();

  return 0;
}

function populateCard()
{
  if (_cust.id() <= -1)
    _card.clear();
  else
  {
    var params = new Object;
    params.masterCard     = "MasterCard";
    params.visa           = "VISA";
    params.americanExpress= "American Express";
    params.discover       = "Discover";
    params.other          = "Other";
    params.cust_id        = _cust.id();
    params.key            = mainwindow.key;
    params.activeonly     = true; // if you want all cards, delete this line

    var qry = toolbox.executeDbQuery("creditCards", "detail", params);
    _card.populate(qry);
  }
}

function populatePrior()
{
  var params = new Object;

  if (_cust.id() > 0)
    params.cust_id      = _cust.id();
  params.preauth        = qsTr("Preauthorization");
  params.charge         = qsTr("Charge");
  params.refund         = qsTr("Refund/Credit");
  params.authorized     = qsTr("Authorized");
  params.approved       = qsTr("Approved");
  params.declined       = qsTr("Declined/Denied");
  params.voided         = qsTr("Voided");
  params.noapproval     = qsTr("Not Approved");
  if (metrics.value("CCValidDays") > 0)
    params.ccValidDays  = metrics.value("CCValidDays");
  else
    params.ccValidDays  = 7;

  _prior.populate(toolbox.executeDbQuery("ccpayments", "list", params));
}

function authorize()
{
  var params = new Object;
  params.ccard_id = _card.id();
  params.cvv      = _cvv.text;
  params.amount   = _amount.localValue;
  params.curr_id  = _amount.id();
  params.neworder = _order.text;

  var results     = _ccp.authorize(params);
  if (results.returnVal < 0)
    QMessageBox.critical(mywindow, qsTr("Credit Card Preauth Error"),
                         _ccp.errorMsg());
  else
    populatePrior();
}

function charge()
{
  var params = new Object;
  params.ccard_id = _card.id();
  params.cvv      = _cvv.text;
  params.amount   = _amount.localValue;
  params.curr_id  = _amount.id();
  params.neworder = _order.text;

  var results     = _ccp.charge(params);
  if (results.returnVal < 0)
    QMessageBox.critical(mywindow, qsTr("Credit Card Charge Error"),
                         _ccp.errorMsg());
  else
    populatePrior();
}

function credit()
{
  var params = new Object;
  params.ccard_id = _card.id();
  params.cvv      = _cvv.text;
  params.amount   = _amount.localValue;
  params.curr_id  = _amount.id();
  params.neworder = _order.text;

  var results     = _ccp.charge(params);
debugProperties(results);
  if (result < 0)
    QMessageBox.critical(mywindow, qsTr("Credit Card Credit Error"),
                         _ccp.errorMsg());
  else
    populatePrior();
}

function chargePreauth()
{
  var params = new Object;
  params.amount   = _amount.localValue;
  params.curr_id  = _amount.id();
  params.ccpay_id = _prior.id();

  var results     = _ccp.chargePreauthorized(params);
  if (results.returnVal + 0 < 0)
    QMessageBox.critical(mywindow, qsTr("Credit Card Charge Preauth Error"),
                         _ccp.errorMsg());
  else
    populatePrior();
}

function voidPrevious()
{
  var params = new Object;
  params.ccpay_id = _prior.id();

  var results     = _ccp.voidPrevious(params);
  if (results.returnVal < 0)
    QMessageBox.critical(mywindow, qsTr("Credit Card Charge Preauth Error"),
                         _ccp.errorMsg());
  else
    populatePrior();
}

_cust.newId.connect(newCustomer);
mywindow.findChild("_authorize").clicked.connect(authorize);
mywindow.findChild("_charge").clicked.connect(charge);
mywindow.findChild("_credit").clicked.connect(credit);
mywindow.findChild("_chargePreauth").clicked.connect(chargePreauth);
mywindow.findChild("_void").clicked.connect(voidPrevious);

newCustomer();
