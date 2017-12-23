<?php
// Call this web service with POST.
// It establishes a new login session at one2edit.
// It downloads a file from the one2edit server to the MediaFerry Server and stores it at the MediaFerry server.
// When all that is complete, it responds to the original POST with xml saying where the downloaded file is on the MediaFerry Server.
// Then it logs out from one2edit.

// SECURITY NOTE:
// It's is MediaFerry's responsibility (not coded here at this time) to establish that the logged-in MediaFerry user
// should be allowed access to the one2edit server. That code should be added to this web service.
?>

<?php

// NO echo() here - session is starting

require('e21session.php');
$username = getP('username');
if ($username == '') { $username = "one2editApiTest@team.expresskcs.com"; }



$t = new One2editTalker($username, TRUE); // does one2edit login always, to create separate session here.

if ($t === false) { // cannot log in to one2edit
  dieWithError($t, 99997, 'Cannot log in to one2edit as '.$username);
}


$mfCommand = getP('command');

switch($mfCommand) {

  case 'getSession': {
    replyGracefully([
      'username'=>$username,
      'baseURL'=>$t->one2editServerBaseUrl,
      'apiUrl'=>$t->one2editServerApiUrl,
      'clientId'=>$t->one2editWorkspaceId,
      'sessionId'=>$t->eSession->sessionId
    ]);
    // DO NOT log out
    exit();
  }
  break;

  case 'downloadFile' : {
    $fileType = getP('fileType');
    if ($fileType == 'pdf') {
      $command = 'document.export.pdf';
      $extension = '.pdf';
    }
    if ($fileType == 'package') {
      $command = 'document.export.package';
      $extension = '.zip';
    }

    $filename = getP('filename');
    $folder = '';
    // $folder = getP('folder'); // SECURITY RISK - could be asked to put downloaded file on top of my program.
    if ($folder == '') { $folder = 'DownloadedFiles'; }
    if (($filename == '') || (strpos($filename, '/') !== FALSE)) { $filename = date('YmdHis').$extension; }
    $filePath = $folder.'/'.$filename;

    // from https://support.one2edit.com/Api/ example on pdf download
    // Generate URL-encoded query string
    $query = http_build_query([
      'command'=>$command,
      'authDomain'=>'local',
      'clientId'=>$t->one2editWorkspaceId,
      'sessionId'=>$t->eSession->sessionId,
      'id'=>$_POST['documentId']
    ]);

    // Build options array
    $opts = array('http' => array(
      'method' => 'POST',
      'header' => 'Content-Type: application/x-www-form-urlencoded; charset=UTF-8',
      'content' => $query )
    );

    // Create a stream context
    $context = stream_context_create($opts);

    // Open stream and get the pdf preview as binary string from API
    $binaryFile = file_get_contents($t->one2editServerApiUrl,false,$context);

    if ($binaryFile === FALSE) { dieWithError($t, 99995, 'Cannot download file'); }
    file_put_contents($filePath, $binaryFile);
    expireGracefully($t, ['filePath'=>$filePath]);
  }
  break;

  case 'setDocumentId': {
    $documentId = getP('documentId');
    // SET documentId in database for this MediaFerry Job
    // NOT YET WRITTEN
    expireGracefully($t, []);
  }
  break;


  default: {
    dieWithError($t, 99994, 'Unknown command: '.$mfCommand);
  }
  break;
}

function getP($p) {
  if (isset($_POST[$p])) { return $_POST[$p]; }
  return '';
}

function xmlHeader() { return '<?xml version="1.0" encoding="utf-8"?>'; } // does not seem to work


function buildXml($r) {
  $built = '';
  foreach($r as $k=>$v) { $built .= '<'.$k.'>'.(is_array($v)?buildXml($v):(string)$v).'</'.$k.'>'; }
  return $built;
}
function respond($r) {
  header("Content-type: text/xml; charset=utf-8");
  echo buildXml($r);
}
function replyGracefully($r) { respond(['success'=>$r]); }
function expireGracefully($t,$r) {
  replyGracefully($r);
  $t->logout();
  exit();
}
function dieWithError($t, $code, $message) {
  $r = ['error'=>['code'=>$code, 'message'=>$message]];
  respond($r);
  if ($t !== FALSE) { $t->logout(); }
  exit();
}
