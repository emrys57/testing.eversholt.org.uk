<?php

// NO echo() here - session is starting

require('e21session.php');
$username = "one2editApiTest@team.expresskcs.com";
$t = new One2editTalker($username); // does one2edit login if needed, reuses existing session if one exists.

// NOTE that above code must be run before anything else is sent to the browser.

echo('All done.<br />');
 ?>
