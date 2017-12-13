<?php
// upload a new InDesign Package to be used as a new master document by one2edit
?>

<html>
<head>
  <title>One2Edit API test</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://demo.one2edit.com/scripts/one2edit.js"></script>
  <script src="https://code.jquery.com/jquery-3.2.1.js"></script>
  <script src="callServer2.js"></script>
  <?php

require('eDebug.php');

  exportToJavascript('new21sessionUrl', 'new21session.php'); // the new21session.php web service will be in the same folder as the one this php came from.
  ?>

  <style>
  .one2edit { /* This is the box that the one2edit Flash screen inhabits, if we use it */
    width:100%; /* leaving it at 100% means that the Flash plugin changes content dynamically with the screen size. */
    height:100vh; /* I have seen a bug with this in Safari - screen taller than the window - but that's safari. */
    background-color: #e6ffff; /* Different colour so that we can see if the Flash plugin has been launched. */
  }
  .progress, .success, .errorReturned {
    display: none; /* the progress announcements are hidden to start with, revealed with slideDown() */
  }
  .errorReturned {
    color: red;
    background-color: #e6efc6;
  }
  .alertBox {
    display: none;
    background-color: #ef7f93;
    border-radius: 0.5em;
    border-color: black;
    border-width: 1px;
  }
  </style>

</head>
<body>
  <div id='textDiv'>
    <h2>Upload an InDesign Package to be used as a new master document</h2>
    First, create a folder holding everything with InDesign - File - Package.
    Then compress that folder and its files into a zip archive.
    Then upload that zip archive.

    <!--  This form here triggers off all the javascript above. Not entirely sure how! -->
    <form method="post" id="fileUploadForm" name="fileinfo" onsubmit="return submitForm2();">
      <label>Select Zip Archive File :</label><br />
      <input type="file" name="data" accept=".zip" required />
      <input type="submit" value="Upload Zip File" />
    </form>
    <form id='editMasterForm' onsubmit='return submitEditMasterForm($("#editMasterForm"));'>
      Document ID:<br />
      <input type='text' name='documentId' class='masterDocumentId documentId' required />
      <input type='submit' value='Edit Document'/>
    </form>
    <div id='progressText'>
    </div>
  </div>

  <div id='flashDiv' class='one2edit' style='display:none'>
    <div id="flashContent"> </div>
  </div>

  <script type="text/javascript">

  // this is the sequence of server API calls to make.
  // We have to declare it here so that submitForm2 can find it
  // but we can only set it later because callServer.js is still loading when this code runs
  var callSequence0;
  var genericEvent = function(a, event) {
    var thisProgress = event+': ';
    var name = '';
    if ($.isArray(a.callSequence) && (typeof a.sequenceIndex != 'undefined') && (typeof a.callSequence[a.sequenceIndex] != 'undefined') && (typeof a.callSequence[a.sequenceIndex].f == 'function')) {
      if (typeof a.callSequence[a.sequenceIndex].stage != 'undefined') {
        name = a.callSequence[a.sequenceIndex].stage;
        switch(event) {
          case 'beforeStart':
          thisProgress = a.callSequence[a.sequenceIndex].stage + ': ';
          break;
          case 'onDone':
          thisProgress = 'Success!<br />';
          break;
          case 'onError':
          thisProgress = 'Error: ☹️<br />';
          var code = a.$xml.find('error').children('code').text();
          var message = a.$xml.find('message').text();
          if ((typeof code != 'undefined') && (code != '')) {
            thisProgress += 'The server returned error code '+code+' with the message: '+message+'<br />';
          }
          break;
          default:
          thisProgress = 'Unkown event: '+event+'<br />';
        }
      } else {
        thisProgress += a.callSequence[a.sequenceIndex].f.name;
      }
      console.log(event, ': ', name, 'a: ', a);
      $('#progressText').append(thisProgress);
    }
  }
  var genericEvents = {
    adjustDisplayForFlash: function(a) {
      $('#textDiv').hide();
      $('#flashDiv').show();
      console.log('adjusted display for flash');
    },
    adjustDisplayAfterFlash: function(a) {
      $('#flashDiv').hide();
      $('#textDiv').show();
      window.onbeforeunload = undefined;
      console.log('adjusted display after flash');
    },
    beforeStart: genericEvent,
    onDone: genericEvent,
    onError: genericEvent,
    noEditableLayers: function(a, event) {
      $('#progressText').append('NO EDITABLE LAYERS! <br />');
    },
    beforeApiCall: function(a, event, ajaxCallObject) {
      console.log('callServer: beforeApiCall: ', ajaxCallObject);
    },
    onApiResponse: function(a, event) {
      console.log('callServer: onApiResponse: ', a.$xml[0]);
    },
    loginFailed: function(a, event) {
      $('#progressText').append('FAILED TO LOG IN to server. <br />');
    },
    uploadedMastersFolder: function(a, event) {
      $('#progressText').append('Cannot find uploaded masters folder at server. <br />');
    },
    assetProject: function(a, event) {
      $('#progressText').append('Cannot find asset project ID. <br />');
    },
    sequenceDone:function(a,event) {
        $('#progressText').append('All finished OK.<br />');
    }
  };

  function submitForm2() { // called when submit button is pressed on form
    var a = {
      // this object is the initial value of 'a' which is passed through all the library functions.
      $form:$('#fileUploadForm'),
      callSequence: callSequence0,
      genericEvents: genericEvents
    };
    L$.startSequence(a);
    return false; // MUST return false or chaos ensues, browser reloads with POST.
  }

  function submitEditMasterForm($form) {
    var a = {
      callSequence: editCallSequence,
      documentId: $form.find('.documentId').val(),
      genericEvents: genericEvents
    }
    L$.startSequence(a);
    return false; // MUST return false or chaos ensues.
  }

  var callSequenceEdit = [
    // open the Flash editor knwing the document project Id. a.documentId must be the document Proejct Id.
    {f:L$.editDocument, stage: 'Editing Document'},
    {f:regainControl, stage: 'Returning to calling code'}
  ];

  function regainControl(a) {
    // this function is here to demonstrate that control has returned from async chained API calls to ordinary website code.
    console.log('regainControl: Control regained 😀');
    $('#progressText').append('<br />Control has been regained.<br />');
  }

  function setDocumentId(a) {
    $('.documentId').val(a.documentId);
    L$.passOn(a);
  }

  $(document).ready(function() {

    // definitely have to use .ready() here or all is chaos
    // because otherwise this code tries to run before callServer.js has loaded and the L$ library is a complete mess.
    // L$.logoutFromServer({}); // have already established one2edit session in old code. Log  out that session, force a new one to test new code.

    $(window).on('unload', function(){ console.log('unload running'); L$.logoutFromServer({}); }) // Must logout on leaving this page or we'll run out of one2edit licences.

    // This sequence is handled in order by the library API calls in callServer.js
    callSequence0 = [
      {f:L$.startSession, stage: 'Logging In'},
      {f:L$.findAssetProjectId, stage: 'Finding Asset Project ID'},
      {f:L$.submitForm, stage:'Uploading zip file'},
      {f:L$.doUnzipAtServer, stage:'Unzipping file'},
      {f:L$.doSearchForInddFile, stage:'Searching for InDesign file'},
      {f:L$.findUploadedMastersFolderId, stage: 'Finding UploadedMasters folder'},
      {f:L$.doCreateProject, stage:'Creating editable document from InDesign file'},
      {f:L$.doAddContentGroup, stage:'Creating the Editable Content Group'},
      {f:L$.doPopulateContentGroup, stage:'Moving content into the Editable Content Group'},
      {f:setDocumentId, stage:'Setting Document ID'},
      {f:L$.logoutFromServer, stage:'Logging out from server'}
    ];


    editCallSequence = [
        {f:L$.startSession, stage: 'Logging In'},
        {f:L$.editDocument, stage: 'Editing Document'} // ending this does logout anyway
    ]

    // if (wantTemplateslessJob) { callSequence0.push({f:L$.startTemplatelessTemplateJob, stage: 'Starting templateless template job'}); } // NOTE executing this later will change the value of a.callSequence

  });


</script>


</body>
</html>
