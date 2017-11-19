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
  <!-- anyone there?<br /> -->
  <?php
  $username = "plamba@team.expresskcs.com";
  $password = "eKCS*88042";
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
        debug(0, "Server operation returned an error message. The server said:<br />");
        debug(0, "code: ".$sxml->code.".<br />message: ".$sxml->message.".<br /><br />");
        return FALSE;
      }
      return $sxml;
    } catch (Exception $e) {
      debug(0, "Error returned from server. The server said:$result.<br />");
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
      debug(0,"Authorisation failed<br />");
      if ($sxml !== FALSE) { var_dump($sxml); }
      return FALSE;
    }
    $commonData["sessionId"] = $login->session;
    return $login;
  }

  function aFolder() {
    global $testURL, $commonData;
    debug(1, "Trying to find folder now.");
    $data = ["command"=>"template.folder.list"];
    foreach ($commonData as $k=>$v) { $data[$k] = $v; }
    $sxml = CallAPI("POST", $testURL, $data);
    $missing = "";
    if (!isset($sxml->folders->folder[0]->id)) { $missing .= "folder[0].id "; }
    if ($missing != "") {
      debug(0,"Template folder search failed<br />");
      if ($sxml !== FALSE) { var_dump($sxml); }
      return FALSE;
    }
    debug(1, "aFolder returning ".$sxml->folders->folder[0]->id);
    return $sxml->folders->folder[0]->id;
  }

  function debug($level, $message) {
    global $debugLevel;
    if ($debugLevel >= $level) { echo($message."<br />"); }
  }

  function findAnyTemplate($folderId) {
    global $testURL, $commonData;
    debug(1, "Going to list templates in folder $folderId.");
    $data = ["command"=>"template.list", "folderId"=>$folderId];
    foreach ($commonData as $k=>$v) { $data[$k] = $v; }
    $sxml = CallAPI("POST", $testURL, $data);
    $missing = "";
    if (!isset($sxml->templates->template[0]->id)) { $missing .= "template[0].id "; }
    if ($missing != "") {
      debug(0,"Template search failed<br />");
      if ($sxml !== FALSE) { var_dump($sxml); }
      return FALSE;
    }
    return $sxml->templates->template[0]->id;
  }

  function startTemplateJob($templateId) {
    global $testURL, $commonData;
    debug(1, "Trying to find job associated with templateId $templateId.");
    $data = ["command"=>"template.start", "id"=>$templateId];
    foreach ($commonData as $k=>$v) { $data[$k] = $v; }
    $sxml = CallAPI("POST", $testURL, $data);
    $missing = "";
    if (!isset($sxml->templates->template[0]->rubbish)) { $missing .= "template[0].id "; }
    if ($missing != "") {
      debug(0,"Template start failed<br />");
      if ($sxml !== FALSE) { var_dump($sxml); }
      return FALSE;
    }
    return FALSE;
  }

  $login=doLogin($username, $password); // will return FALSE if anything is amiss
  if (!$login) { exit(); } // so we quit in disgust


  echo("<script>");
  echo("session=\"".$login->session."\"; name=\"".$login->user->name."\"; domain=\"".$login->user->domain."\"; id=\"".$login->user->id."\"; identifier=\"".$login->user->identifier."\";");
  echo("baseURL=\"$baseURL\"; workspaceID=\"$workspaceID\";");
  echo("</script>");
  debug(1,"session: ".$login->session."<br />");
  debug(1,"name: ".$login->user->name."<br />");
  debug(1,"domain: ".$login->user->domain."<br />");
  debug(1,"identifier: ".$login->user->identifier."<br />");

  $folderId = aFolder();
  debug(1, "aFolder returned ".$folderId);
  if ($folderId === FALSE) { echo("folderId is FALSE"); exit(); }
  echo("<script>\nfolderId=\"$folderId\";\n</script>\n");
  debug(1,"template folderId: $folderId<br />");
  $templateId = findAnyTemplate($folderId);
  if ($templateId === FALSE) {  exit; }
  debug(1, "Trying to edit template $templateId.");
  $jobId = startTemplateJob($templateId);
  if ($jobId === FALSE) {  exit; }
  debug(1, "Trying to run job $jobId.");
  echo("<script>jobId=$jobId;\nworskspaceID=$workspaceId\n</script>");


  debug(1,"<br />All done.<br />")

  ?>
  <div class="one2edit">
    <!-- Without this div with 'flashContent' as id the swf object can't be placed -->
    <div id="flashContent"> </div>
  </div>

  <script type='text/javascript'>
  // Create a one2edit object with the desired attributes, flashvars, options  and parameters
  console.log("Going to edit job "+jobId+" in workspace "+workspaceID+" in session "+session);
  one2edit.create({
    parameters: {
      wmode: 'opaque'
    },
    flashvars: {
      server: baseURL,
      sessionId: session,        // A sessionId is returned when we authenticate a user (see API example)
      clientId: workspaceID,                    // Id of our Client Workspace
      idleTimeout: 900,
      jobEditor: {
        jobId: jobId               // A jobId is returned when we start a job template (see API example)
      }
    }
  });
  </script>
  <!-- Anyone at all? -->
</body>
</html>
