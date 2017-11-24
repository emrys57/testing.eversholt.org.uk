<!DOCTYPE html>
<!--
To change this license header, choose License Headers in Project Properties.
To change this template file, choose Tools | Templates
and open the template in the editor.
-->
<html>
<head>
  <title>One2Edit API test</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script type="text/javascript" src="https://demo.one2edit.com/scripts/one2edit.js"></script>

  <style>
  .one2edit {
    width:940px;
    height:500px;
    background-color: red;
  }
  </style>

</head>
<body>
  <?php
  require('./NotForGithub/passwords.php');
  $username = "one2editApiTest@team.expresskcs.com";
  $password = passwordFor($username);
  if ($password === FALSE) { debug(0, "failed to find password for $username."); exit(); }
  $workspaceId = "888";
  $baseURL = "https://demo.one2edit.com";
  $testURL = $baseURL."/Api.php";
  $one2editDomain = "local";
  $sessionId = "invalidSessionId";
  $clientId = "invalidClientId";
  if (isset($_GET["debug"])) {echo("debug is set<br />"); $debugLevel = $_GET["debug"];} else {$debugLevel = 0;}
  debug(1,"debugLevel is $debugLevel.");
  $secretData = ["authUsername"=>$username, "authPassword"=>$password, "authDomain"=>$one2editDomain];
  $commonData = ["clientId"=>$workspaceId];


  // from https://stackoverflow.com/questions/9802788/call-a-rest-api-in-php
  // Method: POST, PUT, GET etc
  // Data: array("param" => "value") ==> index.php?param=value

  function CallAPI($method, $url, $data = false) {
    $s = "curl $method to $url:<br />";
    foreach($data as $k=>$v) { $s .= "$k:$v<br />"; }
    debug(2,$s);

    $curl = curl_init();

    switch ($method) {
      case "POST":
      curl_setopt($curl, CURLOPT_POST, 1);

      if ($data)
      curl_setopt($curl, CURLOPT_POSTFIELDS, $data);
      break;
      case "PUT":
      curl_setopt($curl, CURLOPT_PUT, 1);
      break;
      default:
      if ($data)
      $url = sprintf("%s?%s", $url, http_build_query($data));
    }

    // Optional Authentication:
    // curl_setopt($curl, CURLOPT_HTTPAUTH, CURLAUTH_BASIC);
    // curl_setopt($curl, CURLOPT_USERPWD, "username:password");

    curl_setopt($curl, CURLOPT_URL, $url);
    curl_setopt($curl, CURLOPT_RETURNTRANSFER, 1);

    $result = curl_exec($curl);

    if ($result === FALSE) {
      debug(0, "curl_exec returned FALSE: " . curl_error($curl). "<br />");
      return FALSE;
    }

    // $curlInfo = curl_getinfo($curl);
    // $info ="<br />curlInfo:<br />";
    // foreach ($curlInfo as $key => $value) {
    //   $info = $info.$key.": ".$value."<br \>";
    // }
    // $info = $info."data:<br />";
    // foreach ($data as $k=>$v) {
    //   $info = $info.$k.": ".$v."<br \>";
    // }
    // echo($info);

    curl_close($curl);

    try {
      $sxml = new SimpleXMLElement($result);
      if (isset($sxml->code) and isset($sxml->message)) {
        debug(0, "Server operation returned an error message. The server said:");
        debug(0, "code: ".$sxml->code.".<br />message: ".$sxml->message.".<br />");
        return FALSE;
      }
      return $sxml;
    } catch (Exception $e) {
      debug(0, "Error returned from server. The server said:$result.");
      return FALSE;
    }
  }

  function doLogin($n, $p) {
    global $testURL, $commonData, $secretData;

    debug(1,"Trying authorisation for $n now.");
    $data = ["command"=>"user.auth", "username"=>$secretData["authUsername"], "password"=>$secretData["authPassword"], "domain"=>$secretData["authDomain"]];
    $sxml = CallAPI("POST", $testURL, $data);
    $missing = "";
    if (isset($sxml->login)) {
      $login = $sxml->login;
      if (!isset($login->session)) { $missing .= "session "; }
      if (!isset($login->user->name)) { $missing .= "name "; }
      if (!isset($login->user->domain)) { $missing .= "domain "; }
      if (!isset($login->user->id)) { $missing .= "id "; }
      if (!isset($login->user->identifier)) { $missing .= "identifier "; }
    } else { $missing .= "login"; }
    if ($missing != "") {
      debug(0,"Authorisation failed");
      debug(0, "Missing: $missing");
      if ($sxml !== FALSE) { var_dump($sxml); }
      return FALSE;
    }
    $commonData["sessionId"] = $login->session;
    return $login;
  }

  function aTemplateFolder() {
    global $testURL, $commonData;
    debug(1, "Trying to find folder now.");
    $data = ["command"=>"template.folder.list"];
    foreach ($commonData as $k=>$v) { $data[$k] = $v; }
    $sxml = CallAPI("POST", $testURL, $data);
    $missing = "";
    if (!isset($sxml->folders->folder[0]->id)) { $missing .= "folder[0].id "; }
    if ($missing != "") {
      debug(0,"Template folder search failed");
      debug(0, "Missing: $missing");
      if ($sxml !== FALSE) { var_dump($sxml); }
      return FALSE;
    }
    debug(1, "aFolder returning ".$sxml->folders->folder[0]->id);
    return $sxml->folders->folder[0]->id;
  }

  function debug($level, $message="") {
    global $debugLevel;
    if ($message == "") return ($debugLevel >= $level); // empty message just asks if debug level is high enough to print.
    if ($debugLevel >= $level) { echo($message."<br />"); }
  }

  function findAnyTemplate($folderId) {
    global $testURL, $commonData;
    debug(1, "Going to list templates in folder $folderId.");
    $data = ["command"=>"template.list", "folderId"=>$folderId];
    foreach ($commonData as $k=>$v) { $data[$k] = $v; }
    $sxml = CallAPI("POST", $testURL, $data);
    debug(3, "template.list API call returned:");
    if (debug(3)) { var_dump($sxml); echo("<br />"); }
    $missing = "";
    if (!isset($sxml->templates->template[0]->id)) { $missing .= "template[0].id "; }
    if ($missing != "") {
      debug(0,"Template search failed");
      debug(0, "Missing: $missing");
      if ($sxml !== FALSE) { var_dump($sxml); }
      return FALSE;
    }
    return $sxml->templates->template[0]->id;
  }

  function findTemplateNamed($folderId, $nameWanted) {
    global $testURL, $commonData;
    debug(1, "Going to find template \"$nameWanted\" in folder $folderId.");
    $data = ["command"=>"template.list", "folderId"=>$folderId];
    foreach ($commonData as $k=>$v) { $data[$k] = $v; }
    $sxml = CallAPI("POST", $testURL, $data);
    debug(3, "template.list API call returned:");
    if (debug(3)) { var_dump($sxml); echo("<br />"); }
    $idToReturn = FALSE;
    $missing = "";
    if (!isset($sxml->templates->template[0])) { $missing .= "template[0] "; }
    else {
      $templates = $sxml->templates->template; // strange naming convention by one2edit
      foreach ($templates as $template) {
        debug(3, "Looking at template named \"$template->name\".");
        if ((isset($template->name)) and ($template->name == $nameWanted)) {
          if (!isset($template->id)) { $missing .= "$name.id "; }
          else {
            $idToReturn = $template->id;
            debug(3, "findTemplateNamed \"$nameWanted\" is returning id $idToReturn.");
          }
        }
      }
    }
    if ($missing != "") {
      debug(0,"Template search failed.");
      debug(0, "Missing: $missing");
      if ($sxml !== FALSE) { var_dump($sxml); }
      return FALSE;
    }
    return $idToReturn;
  }

  function startTemplateJob($templateId) {
    global $testURL, $commonData;
    debug(1, "Trying to find job associated with templateId $templateId.");
    $data = ["command"=>"template.start", "id"=>$templateId];
    foreach ($commonData as $k=>$v) { $data[$k] = $v; }
    $sxml = CallAPI("POST", $testURL, $data);
    $missing = "";
    if (!isset($sxml->template->jobs->job[0]->id)) { $missing .= "jobs[0].id "; }
    if ($missing != "") {
      debug(0,"Template start failed");
      debug(0, "Missing: $missing");
      if ($sxml !== FALSE) { var_dump($sxml); }
      return FALSE;
    }
    debug(3, "template.start API call returned:");
    if (debug(3)) { var_dump($sxml); echo("<br />"); }
    return $sxml->template->jobs->job[0]->id;
  }

  function findAnyJob() { // find any available task for this user
    global $testURL, $commonData, $username;
    debug(1, "Trying to find any job associated with user $username.");
    // $data = ["command"=>"job.list"];
    $data = ["command"=>"job.list", "status"=>"STARTED"];
    foreach ($commonData as $k=>$v) { $data[$k] = $v; }
    $sxml = CallAPI("POST", $testURL, $data);
    $missing = "";
    if (!isset($sxml->jobs->job[0]->id)) { $missing .= "job[0].id "; }
    if ($missing != "") {
      debug(0,"job.list failed");
      debug(0, "Missing: $missing");
      if ($sxml !== FALSE) { var_dump($sxml); echo("<br />"); }
      return FALSE;
    }
    debug(3, "job.list API call returned:");
    if (debug(3)) { var_dump($sxml); echo("<br />"); }
    $job = $sxml->jobs->job[0];
    debug(2, "job to be opened is:");
    if (debug(2)) { var_dump($job); echo("<br />"); }
    return $job->id;;
  }

  $login=doLogin($username, $password); // will return FALSE if anything is amiss
  if (!$login) { exit(); } // so we quit in disgust


  echo("<script>");
  echo("session=\"".$login->session."\";");//" name=\"".$login->user->name."\"; domain=\"".$login->user->domain."\"; id=\"".$login->user->id."\"; identifier=\"".$login->user->identifier."\";");
  echo("baseURL=\"$baseURL\"; workspaceID=\"$workspaceID\";");
  echo("</script>");
  debug(1,"session: ".$login->session);
  // debug(1,"name: ".$login->user->name);
  // debug(1,"domain: ".$login->user->domain);
  // debug(1,"identifier: ".$login->user->identifier);

  $folderId = aTemplateFolder();
  debug(1, "aTemplateFolder returned ".$folderId);
  if ($folderId === FALSE) { echo("folderId is FALSE"); exit(); }
  echo("<script>\nfolderId=\"$folderId\";\n</script>\n");
  debug(1,"template folderId: $folderId<br />");
  $templateId = findTemplateNamed($folderId, "test2Template");
  if ($templateId === FALSE) {  exit; }
  $jobId = findAnyJob();
  if ($jobId === FALSE) {
    debug(0, "Failed to find any job to run, exiting.");
    exit();
    debug(0, "Failed to find any job to run, starting new one.");
    debug(1, "Trying to edit template $templateId.");
    $jobId = startTemplateJob($templateId);
    if ($jobId === FALSE) {  exit; }
  }
  debug(1, "Trying to run job $jobId.");
  // debug(0, "Quitting anyway.");
  // exit();
  echo("<script>jobId=$jobId;\nworkspaceID=$workspaceId\n</script>");


  debug(1,"<br />All done.<br />")

  ?>
  <div class="one2edit">
    <!-- Without this div with 'flashContent' as id the swf object can't be placed -->
    <div id="flashContent"> </div>
  </div>

  <script type='text/javascript'>
  // Create a one2edit object with the desired attributes, flashvars, options  and parameters
  console.log("Going to edit job "+jobId+" in workspace "+workspaceID+" in session "+session+" at baseURL "+baseURL);

    // console.log("one2edit onCreationComplete:");
    // alert("one2edit onCreationComplete:");
  var myCreationComplete = function(){
    console.log("one2edit: onCreationComplete:");
    alert("one2edit: onCreationComplete");
  };
  // one2edit.options({onCreationComplete: myCreationComplete});
  pp = {
    wmode: 'opaque'
  }
  fp = {
    server: baseURL,
    sessionId: session,        // A sessionId is returned when we authenticate a user (see API example)
    clientId: workspaceID,                    // Id of our Client Workspace
    idleTimeout: 900,
    jobEditor: {
      jobId: jobId               // A jobId is returned when we start a job template (see API example)
    }
  }
  ap = {
    parameters: pp,
    flashvars: fp
    }
    console.log('ap: '+JSON.stringify(ap,null,4));
  one2edit.create(ap);
  </script>
</body>
</html>
