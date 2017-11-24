<?php

if (isset($_GET["debug"])) {
  $debugLevel = $_GET["debug"];
  debug(1,"debugLevel is $debugLevel.");
} else { $debugLevel = 0; }


function debug($level, $message="") {
  global $debugLevel;
  if ($message == "") return ($debugLevel >= $level); // empty message just asks if debug level is high enough to print.
  if ($debugLevel >= $level) { echo($message."<br />"); }
}


 ?>
