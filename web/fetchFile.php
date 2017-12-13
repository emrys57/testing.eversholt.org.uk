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
if (!isset($_POST['username'])) { $username = "one2editApiTest@team.expresskcs.com"; }
else { $username = $_POST['username']; }

$t = new One2editTalker($username, TRUE); // does one2edit login always, to create separate session here.

if ($_POST['fileType'] == 'pdf') {
  $command = 'document.export.pdf';
  $extension = '.pdf';
}
if ($_POST['fileType'] == 'package') {
  $command = 'document.export.package';
  $extension = '.zip';
}

if (!isset($_POST['filename']) || ($_POST['filename'] == '') || (strpos($_POST['filename'], '/') !== FALSE)) { $filename = date('YmdHis').$extension; }
else { $filename = $_POST['filename']; }
$filePath = 'DownloadedFiles/'.$filename;

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
$opts = array('http' =>
     array(
          'method' => 'POST',
          'header' => 'Content-Type: application/x-www-form-urlencoded; charset=UTF-8',
          'content' => $query
     )
);

// Create a stream context
$context = stream_context_create($opts);

// Open stream and get the pdf preview as binary string from API
$binaryFile = file_get_contents($t->one2editServerApiUrl,false,$context);
file_put_contents($filePath, $binaryFile);
$t->logout();



function toXml($name, $value) { return '<'.$name.'>'.$value.'</'.$name.'>'; }
function xmlHeader() { return '<?xml version="1.0" encoding="utf-8"?>'; }

function sendResponse($t, $filePath) {
  $wholeResponse = '';
  $responses = [
    'filePath'=>$filePath
  ];
  $thisResponse = '';
  foreach ($responses as $k=>$v) {
    $thisResponse .= toXML($k, $v);
  }
  $wholeResponse .= toXml('downloadedFile', $thisResponse);
  return $wholeResponse;
}

function sendError() {
  $wholeResponse = '';
  $responses = [
    'code'=>99998,
    'message'=>'Cannot download file'
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
  echo sendResponse($t, $filePath);
} else {
  echo sendError();
}
