<?php

// This version of ExpresskCS-to-one2edit test code establishes a session, the EKCS session, between the user's browser and this program.
// This program here running on an EKCS server logs in with username and password to the one2edit server, establishing the one2edit session.
// The EKCS session storage is used to store the one2edit sessionId.
// So, when the suer's browser comes back here again, we first try to reuse the one2edit sessionId we find stored.
// Only if that one2edit sessionId is not recognised by one2edit do we log in to one2edit with username and password again.
// This is because we seem to see one2edit keeping open multiple sessions for the same user and running out of
// licence rights because it uses one licence per session. It only recovers the licence when the session times out.
//
// I think. Seems reasonable, anyway.

require('genericSession.php');
require('./NotForGithub/passwords.php');
require('eDebug.php');

class One2editTalker {

  private $one2editAuthUsername; // the authUsername used to log in to one2edit
  private $eSession; // the instance of the Session object retaining the state of the user's session with this EKCS server
  private $one2editServerBaseUrl = 'https://demo.one2edit.com';
  public $pv = 'pardon?';

  function __construct() { // bizarre php scheme for constructors with parameters - http://php.net/manual/en/language.oop5.decon.php
    $a = func_get_args();
    $i = func_num_args();
    if (method_exists($this,$f='__construct'.$i)) {
      call_user_func_array(array($this,$f),$a);
    }
  }

  function __construct1($username) {
    // echo('construct1: trying $username.<br />');
    $this->one2editAuthUsername = e21Username($username);
    $this->eSession = Session::getInstance(); // the session between the user's browser and this EKCS server. Session is created if not already present.
    if (!isset($this->eSession->one2editAuthUsername)) { // No one2edit session has been set up at all
      debug(2, 'One2editTalker: no edit session set up at all');
      $this->login(); // so try to set one up
      return; // and get out whether or not we have succeeded
    }
    // is it possible to get the username changing in a session?
    // Perhaps.
    if ($this->one2editAuthUsername != $this->eSession->one2editAuthUsername) {
      debug(1, 'One2editTalker: edit session set up with wrong name '.$eSession->one2editAuthUsername.' instead of '.$this->one2editAuthUsername.'.');
      $this->eSession->destroy();
      $this->eSession = Session::getInstance();
      $this->login();
      return; // and get out whether or not we have succeeded
    }
    // here, we already had a username in the exsiting session, and it was equal to the user we're trying to be now, so must have set up a one2edit sessionid.
    // Is that sessionId still usable? Or has it timed out?
    debug(2, 'One2editTalker: trying to ping session '.$eSession->sessionId);
    $data =['command'=>'user.session.ping'];
    $sxml = $this->talk($data, 'POST', '3005'); // if ping worked, this is an empty object. If ping failed, this is FALSE. Don't print error message for code 3005, no session.
    if (debug(3)) { var_dump($sxml); echo ('<br />'); }
    if ($sxml === FALSE) {
      debug(2,'One2editTalker: ping returned false, trying login');
      $this->login();
    }
    debug(2, 'One2editTalker: built One2editTalker');
  }

  private function need($a, $kp, $stageFailure='') { // require variables to be set, or error out
    if ($a === FALSE) { return FALSE; } // allow us to chain these together without repeated error messages
    if (is_array($kp)) { $ks = $kp; } // $kp can be an array or a single string
    else { $ks = [$kp]; } // so we regularise it to an array
    // look for each key in array $a. If it's there, return the value. If it's not, print an error message and return FALSE
    $return = [];
    foreach ($ks as $k) {
      if (isset($a[$k])) { $return[$k] = $a[$k]; }
      else {
        if ($stageFailure != '') { debug(0, $stageFailure); }
        debug(0, "missing: $k.");
        var_dump($a); echo ('<br />');
        return FALSE;
      }
    }
    if (is_array($kp)) { return $return; }
    return $return[$kp];
  }

  private function login() { // try to log in to one2edit and get a sessionId back
    $data = ['command'=>'user.auth', 'username'=>$this->one2editAuthUsername, 'password'=>passwordFor($this->one2editAuthUsername), 'domain'=>one2editDomain($this->one2editAuthUsername)];
    $xml = $this->talk($data);
    $s = 'one2edit login failed';
    $login = $this->need($xml, 'login', $s);
    $session = $this->need($login, 'session', $s);
    if ($session === FALSE) { return FALSE; } // failed to log in
    debug(1,"setting session to $session for ".$this->one2editAuthUsername.'.<br />');
    $this->eSession->sessionId = $session;
    $this->eSession->one2editAuthUsername = $this->one2editAuthUsername;
    return TRUE;
  }

  public function talk($data, $method='POST', $allowedCode=FALSE) { // call the one2edit API with parameters $data. return a simpleXML object or FALSE
    $url = $this->one2editServerBaseUrl.'/Api.php';
    if (isset($this->eSession->sessionId)) { $data['sessionId'] = $this->eSession->sessionId; }
    $s = "curl $method to $url:<br />";
    foreach($data as $k=>$v) {
      if ($k == 'password') { $v = '*******'; }
      $s .= "$k:$v<br />";
    }
    debug(2,$s);

    $curl = curl_init();

    switch ($method) {
      case 'POST':
      curl_setopt($curl, CURLOPT_POST, 1);
      if ($data) { curl_setopt($curl, CURLOPT_POSTFIELDS, $data); }
      break;
      default:
      if ($data) { $url = sprintf("%s?%s", $url, http_build_query($data)); }
    }

    // Optional Authentication:
    // curl_setopt($curl, CURLOPT_HTTPAUTH, CURLAUTH_BASIC);
    // curl_setopt($curl, CURLOPT_USERPWD, 'username:password');

    curl_setopt($curl, CURLOPT_URL, $url);
    curl_setopt($curl, CURLOPT_RETURNTRANSFER, 1);

    $result = curl_exec($curl);

    if ($result === FALSE) {
      debug(0, 'curl_exec returned FALSE: ' . curl_error($curl). '<br />');
      return FALSE;
    }
    try {
      $sxml = new SimpleXMLElement($result);
      if (isset($sxml->code) and isset($sxml->message)) {
        if ($sxml->code != $allowedCode) { // then we want to print an error message
          debug(0, 'Server operation returned an error message. The server said:');
          debug(0, 'code: '.$sxml->code.'.<br />message: '.$sxml->message.'.<br />');
        }
        return FALSE;
      }
      return json_decode(json_encode($sxml), TRUE); // return array not object
    } catch (Exception $e) {
      debug(0, 'Error returned from server. The server said:$result.');
      return FALSE;
    }
  }
}
  ?>
