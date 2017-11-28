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

// In fact, the flash editor refuses to work the second time. I have to log out and log in again to make the flash editor work.
// although everything else seems fine.

require('genericSession.php');
require('./NotForGithub/passwords.php');
require('eDebug.php');

class One2editTalker {

  private $one2editAuthUsername; // the authUsername used to log in to one2edit
  public $eSession; // the instance of the Session object retaining the state of the user's session with this EKCS server
  public $one2editServerBaseUrl = 'https://demo.one2edit.com';
  public $one2editWorkspaceId = FALSE;

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
    $this->one2editWorkspaceId = one2editWorkspaceId($this->one2editAuthUsername); // default workspace Id, may be changed later
    $this->eSession = Session::getInstance(); // the session between the user's browser and this EKCS server. Session is created if not already present.
    //
    debug(2, 'One2editTalker: trying to ping session '.$eSession->sessionId);
    $data =['command'=>'user.session.ping'];
    $sxml = $this->talk($data); // if ping worked, this is an empty object. If ping failed, this will try to log in with username and password, and retry the ping.
    // if it is still FALSE, cannot log in.
    if (debug(3)) { echo('One2editTalker: talk() returned:<br />'); var_dump($sxml); echo ('<br />'); }
    if ($sxml === FALSE) {
      debug(1,'One2editTalker: ping returned false, exit');
      exit();
      // $this->login();
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

  public function talk($data, $method='POST', $mayRecurse=TRUE) { // call the one2edit API with parameters $data. return a simpleXML object or FALSE
    // if the server responds with a session-not-started code, then call login and try again - but only once
    $sessionNotStartedCode = 3005;
    $attributesMissingCode = 13104; // "Missing required attribute 'sessionId' or 'authUsername and 'authPassword". Can happen after much inactivity.
    $url = $this->one2editServerBaseUrl.'/Api.php';
    if (isset($data['command']) and ($data['command'] == 'user.auth')) { // do not add sessionId or workspace
    } else {
      if (isset($this->eSession->sessionId)) {
        $data['sessionId'] = $this->eSession->sessionId;
        $data['clientId'] = $this->one2editWorkspaceId;
      }
    }
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
        if (($sxml->code == $sessionNotStartedCode) || ($sxml->code == $attributesMissingCode) and ($mayRecurse)) {
          debug(2, 'one2edit server returned code 3005, session not started. Trying login.');
          $this->login();
          debug(2, 'retrying original command after login');
          return $this->talk($data, $method, FALSE); // $data entries will be overwritten by new ones.
        }
        debug(0, 'Server operation returned an error message. The server said:');
        debug(0, 'code: '.$sxml->code.'.<br />message: '.$sxml->message.'.<br />');
        return FALSE;
      }
      return json_decode(json_encode($sxml), TRUE); // return array not object
    } catch (Exception $e) {
      debug(0, 'Error returned from server. The server said:$result.');
      return FALSE;
    }
  }

  public function findTopJob() { // find first STARTED job for this user
    $data = ['command'=>'job.list', 'status'=>'STARTED'];
    $xml = $this->talk($data);
    if (debug(3)) { var_dump($xml); echo('<br />'); }
    $s = 'job listing failed';
    $jobs = $this->need($xml, 'jobs', $s);
    if (is_array($jobs) and (count($jobs) == 0)) { debug(0, "No jobs to do."); return FALSE; }
    $job = $this->need($jobs, 'job', $s);
    // Confusingly, the type of 'job' changes from 'indexed-array-of-jobs' to
    // 'associative array of descriptors of one job' when there is only one job.
    // Just fix it.
    if (!is_array($job)) { debug(1, 'Type of $job returned from one2edit server is '.gettype($job).', expected array.<br />'); return FALSE; }
    if (has_string_keys($job)) { $job0 = $job; } // there is only one job and this is it.
    else { $job0 = $job[0]; } // there are multiple jobs and this is the first one
    if (isset($job0['id'])) { return $job0['id']; }
    return $this->need('job[0]->id'); // which will be false, but will give reasonable error message. i hope.
  }

  public function logout() {
    $data = ['command'=>'user.session.quit'];
    $this->talk($data);
  }
}
  ?>
