<?php
// call this web service with POST to establish a new one2edit session and return the session ID for a given user.
// This keeps the one2edit password within the MediaFerry server rather than sending it to the user's browser
// so is marginally less insecure.
// SECURITY NOTE:
// It's is MediaFerry's responsibility (not coded here at this time) to establish that the logged-in MediaFerry user
// should be allowed access to the one2edit server. That code should be added to this web service.
?>

  <?php

  // NO echo() here - session is starting

  require('e21session.php');
  if (!isset($_POST['username'])) { $username = "one2editApiTest@team.expresskcs.com"; }
  else { $username = $_POST['username']; }
  $t = new One2editTalker($username, TRUE); // does one2edit login always, to create separate session here.
  // Always log out of this session when finished with it on the calling page.
  // If you don't log out, you tend to run out of one2edit licences, until the sessions just expire.

  function toXml($name, $value) { return '<'.$name.'>'.$value.'</'.$name.'>'; }
  function xmlHeader() {
    return '<?xml version="1.0" encoding="utf-8"?>';
  }
  function sendResponse($t, $username) {
    $wholeResponse = '';
    $responses = [
      'username'=>$username,
      'baseURL'=>$t->one2editServerBaseUrl,
      'apiUrl'=>$t->one2editServerApiUrl,
      'clientId'=>$t->one2editWorkspaceId,
      'sessionId'=>$t->eSession->sessionId
    ];
    $thisResponse = '';
    foreach ($responses as $k=>$v) {
      $thisResponse .= toXML($k, $v);
    }
    $wholeResponse .= toXml('one2editSession', $thisResponse);
    return $wholeResponse;
  }
  function sendError() {
    $wholeResponse = '';
    $responses = [
      'code'=>99999,
      'message'=>'Cannot log in to server'
    ];
    $thisResponse = '';
    foreach ($responses as $k=>$v) {
      $thisResponse .= toXML($k, $v);
    }
    $wholeResponse .= toXml('error', $thisResponse);
    return $wholeResponse;
  }


  header("Content-type: text/xml; charset=utf-8");
  if ($t !== FALSE) {
  echo sendResponse($t, $username);
} else {
  echo sendError();
}
