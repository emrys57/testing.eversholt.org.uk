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
$baseUrl = getP('baseUrl');
// $clientIPAddress = $_SERVER['REMOTE_ADDR'].','.'94.126.40.41'; // $_SERVER['SERVER_ADDR']; // cannot get correct server address
// if ($username == '') { $username = "one2editApiTest@team.expresskcs.com"; }
// if ($baseUrl == '') { $baseUrl = 'https://demo.one2edit.com'; }
//
if ($username == '') { $username = "one2edit.production@expresskcs.com"; }
if ($baseUrl == '') { $baseUrl = 'https://one2edit.mediaferry.com'; }

  $t = new One2editTalker($username, TRUE, $baseUrl); // does one2edit login always, to create separate session here.
  debugLater("mfAdmin: baseUrl:$baseUrl");
  if ($t === false) { // cannot log in to one2edit
    dieWithError($t, 99997, 'Cannot log in to one2edit as '.$username);
  }


  $mfCommand = getP('command');

  switch($mfCommand) {

    case 'getSession': {
      replyGracefully([
        'username'=>$username,
        'baseUrl'=>$t->one2editServerBaseUrl,
        'apiUrl'=>$t->one2editServerApiUrl,
        'clientId'=>$t->one2editWorkspaceId,
        'sessionId'=>$t->eSession->sessionId,
        'clientIPAddress'=>$t->clientIPAddress
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

      $documentId = getP('documentId');
      $clientId = $t->one2editWorkspaceId;
      $sessionId = $t->eSession->sessionId;
      $apiUrl = $t->one2editServerApiUrl;
      // from https://support.one2edit.com/Api/ example on pdf download
      // Generate URL-encoded query string
      $query = http_build_query([
        'command'=>$command,
        'authDomain'=>'local',
        'clientId'=>$clientId,
        'sessionId'=>$sessionId,
        'id'=>$documentId
      ]);

      // Build options array
      $opts = array('http' => array(
        'method' => 'POST',
        'header' => 'Content-Type: application/x-www-form-urlencoded; charset=UTF-8',
        'content' => $query )
      );
      debugLater("mfAdmin: downloadfile: query:$command $clientId $sessionId $documentId $apiUrl");
      // Create a stream context
      $context = stream_context_create($opts);
// echo('one2editServerApiUrl:'.$t->one2editServerApiUrl.' sessionId:'.$t->eSession->sessionId );
      // Open stream and get the pdf preview as binary string from API
      $binaryFile = file_get_contents($apiUrl,false,$context);

      if ($binaryFile === FALSE) {
        debugLater('mfAdmin: binaryFile is false');
        dieWithError($t, 99995, 'Cannot download file');
      }
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

    case 'uploadAsset': {
      $filePathAtMediaFerry = getP('filePathAtMediaFerry');
      if ($filePathAtMediaFerry == '') { $filePathAtMediaFerry = 'DownloadedFiles/test.zip'; }
      $projectId = getP('projectId'); // that's the asset project
      $folderIdentifier = getP('folderIdentifier'); // pathname to upload folder
      $pa = [
        'command'=>'asset.upload',
        'authDomain'=>'local',
        'clientId'=>$t->one2editWorkspaceId,
        'sessionId'=>$t->eSession->sessionId,
        'projectId'=>$projectId,
        'folderIdentifier'=>$folderIdentifier,
        'data'=> new CurlFile($filePathAtMediaFerry) // php 5.5 onwards
      ];
      $ch = curl_init();
      curl_setopt($ch, CURLOPT_POST, true);
      curl_setopt($ch, CURLOPT_SAFE_UPLOAD, true); // php 5.5 onwards
      curl_setopt($ch, CURLOPT_POSTFIELDS, $pa);
      curl_setopt($ch, CURLOPT_URL, $t->one2editServerApiUrl);
      curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);

      $result = curl_exec($ch);

      if ($result === FALSE) { dieWithErrror($t, 99993, 'curl returned FALSE: curl_error said: '. curl_error($ch)); }
      curl_close($ch);
      // Not sure if this will always work, but I am going to try returning the one2edit data as the xml output from this program.
      $resultWithoutHeader = preg_replace('/^[^>]*>/', '', $result); // HAVE NO IDEA WHY I HAVE TO DO THIS but it works.
      sendXmlString($resultWithoutHeader);
      quitNicely($t);
    }
    break;

    default: { dieWithError($t, 99994, 'Unknown command: '.$mfCommand); }
    break;
  }

  function getP($p) { return isset($_POST[$p]) ? $_POST[$p] : ''; }

  function xmlHeader() { return '<?xml version="1.0" encoding="utf-8"?>'; } // does not seem to work


  function buildXml($r) {
    $built = '';
    foreach($r as $k=>$v) { $built .= '<'.$k.'>'.(is_array($v)?buildXml($v):(string)$v).'</'.$k.'>'; }
    return $built;
  }
  function sendXmlString($s) {
    header("Content-type: text/xml; charset=utf-8");
    echo($s);
  }
  function respond($r) { sendXmlString(buildXml($r)); }
  function replyGracefully($r) { respond(['success'=>$r]); }
  function quitNicely($t) {
    if ($t !== FALSE) {
      debugLater('quitNicely: trying to log out');
      $t->logout();
    }
    // debugNow(); // turning this on sends the debug info but also destroys the xml, so you get xml errors
    exit();
  }
  function expireGracefully($t,$r) {
    replyGracefully($r);
    quitNicely($t);
  }
  function dieWithError($t, $code, $message) {
    $r = ['error'=>['code'=>$code, 'message'=>$message]];
    respond($r);
    quitNicely($t);
  }
