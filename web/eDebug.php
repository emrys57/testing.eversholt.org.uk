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

// from https://stackoverflow.com/questions/173400/how-to-check-if-php-array-is-associative-or-sequential/4254008#4254008
function has_string_keys(array $array) {
  if (!is_array($array)) { return FALSE; } // if it is not an array then it does not have string keys.
  return count(array_filter(array_keys($array), 'is_string')) > 0;
}

function exportToJavascript($javascriptVariablename, $value, $exportAsString=FALSE) {
  // define a javascript variable and give it a value from a php variable.
  // if $value is a string, or if $exportAsString is true, then enclose the value in double quotes.
  // This cannot handle double quotes in $value ☹️
  $quote = ""; // the empty string
  if ((gettype($value) == 'string') or ($exportAsString)) { $quote = "\""; } // a string contining a double quote
  echo("<script> var  $javascriptVariablename = $quote$value$quote; </script>");
}

 ?>
