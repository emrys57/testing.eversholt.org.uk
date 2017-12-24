<?php
// DEMO FILE. Not production quality!
// This page demonstrates teh features of the callServer2.js library.
?>

<html>
<head>
  <title>One2Edit API test</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://demo.one2edit.com/scripts/one2edit.js"></script>
  <script src="https://code.jquery.com/jquery-3.2.1.js"></script>
  <script src="mfSmart1.js"></script>
  <?php

  require('eDebug.php');

  ?>
  <script> L$.adminUrl = 'mfAdmin.php'; </script> // support program

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
  .oneForm {
    border-width: 2px;
    border-radius: 1vw;
    border-color: Carbon;
    border-style: solid;
    background-color: #ccffff;
    padding: 1vw;
    padding-top:0.5vw;
    margin: 1vw;
  }
  .templateGrid {
    display:grid;
    grid-template-columns: repeat(3, 1fr);
    grid-gap: 10px;
  }
  .oneBox {
    border-width: 1px;
    border-radius: 0.3vw;
    border-color: #666666;
    border-style: solid;
    background-color: white;
    padding: 1vw;
    margin: 1vw;
    width: 25vw;
  }
  .boxText {
    display: inline-block;
    vertical-align: top;
  }

  .bottomRight {
    display:inline-block;
    float: right;
    vertical-align: bottom;
  }
  </style>

</head>
<body>
  <div id='textDiv'>

    <h2>MediaFerry-to-one2edit test page.</h2>
    <div class='oneForm'>
      <h3>Upload an InDesign Package to be used as a new master document</h3>
      First, create a folder holding everything with InDesign - File - Package.
      Then compress that folder and its files into a zip archive.
      Then upload that zip archive.<br /> <br />

      <!--  This form here triggers off all the javascript with the 'onsubmit'. -->
      <form id="fileUploadForm" name="fileinfo" onsubmit="return submitForm2();">
        <label>Select Zip Archive File :</label><br />
        <input type="file" name="data" accept=".zip" required />
        <input type="submit" value="Upload Zip File" />
      </form>
    </div>
    <div class='oneForm'>
      <h3>Test UPloading from MediaFerry server to one2edit.</h3>
      <form id='up2Form' onsubmit='return submitUp2Form($("#up2Form"));'>
        <input type='submit' value='Upload from MF' />
      </form>
    </div>
    <div class='oneForm'>
      <h3> Edit documents, download as PDF or as Zipped InDesign package.</h3>
      The document number is the one from the one2edit server. <br /><br />
      <!-- see below at submitDocumentForm2 for an explanation of how this works. -->
      <form id='documentForm' onsubmit='return false;'>
        Document ID:<br />
        <input type='text' name='documentId' class='masterDocumentId documentId' required />
        <input class='class1' type='submit' data-operation='editDocument' value='Edit Document' />
        <input class='class1' type='submit' data-operation='downloadPdf' value='Download PDF'/>
        <input class='class1' type='submit' data-operation='downloadPackage' value='Download InDesign Package zip file'/>
        <input class='class1' type='submit' data-operation='fetchPdf' value='Store PDF at MediaFerry server'/>
        <input class='class1' type='submit' data-operation='fetchZipPackage' value='Store InDesign Package zip file at Mediaferry Server'/>
        <input class='class1' type='submit' data-operation='editTemplateless' value='Edit Templateless' />
        <input class='class1' type='submit' data-operation='findAssetInfo' value='Find Asset info' />
        <input class='class1' type='submit' data-operation='moveToMediaFerry' value='Move Document to MediaFerry' />
      </form>
    </div>
    <div class='oneForm'>
      <h3>Open the one2edit Administration Interface.</h3>
      <form id='adminForm' onsubmit='return submitAdminForm($("#adminForm"));'>
        <input type='submit' value='Open Administration Interface' />
      </form>
    </div>
    <div class='oneForm'>
      <h3>Upload a new zip package for a master document and create a templated workflow.</h3>
      Choose a zipped InDesign package archive to create the new master document. Define a description and optional tags for the template.<br /><br />
      <form id='templatedForm' onsubmit='return submitTemplatedForm($("#templatedForm"));'>
        Template Name:<br />
        <input type='text' id='templateName' style='width: 40%;' required />
        <br />Template Tags, separated by space:<br />
        <input type='text' id='tagField' style='width: 80%;'/>
        <br />Template Description:<br />
        <textarea id='descriptionText' style='width:80%; rows: 4;' ></textarea>
        <br /><label>Select Zip Archive File :</label><br />
        <input type="file" name="data" accept=".zip" required />
        <input type="submit" value="Upload Zip File" />
      </form>
    </div>
    <div class='oneForm'>
      <h3>Show the available templated documents.</h3>
      <form id='listForm' onsubmit='return submitListForm($("#listForm"));'>
        <input type='submit' value='List Templates' />
      </form>
      <div id='listTemplatesHere'>
      </div>
    </div>
    <div id='progressText'>
    </div>
  </div>

  <div id='flashDiv' class='one2edit' style='display:none'>
    <div id="flashContent"> </div>
  </div>

  <script type="text/javascript">

  function aGeneric(callSequence) {
    // return a generic 'a' object
    return {
      genericEvents: genericEvents,
      callSequence: callSequence
    }
  }

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
      $('#progressText').append('NO EDITABLE LAYERS! Making all layers editable: ');
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
    },
    cannotFindFolder: function(a, event, folderName) {
      $('#progressText').append('Cannot find folder: '+folderName+'<br />');
    },
    cannotFindFile: function(a, event, fileName) {
      $('#progressText').append('Cannot find file: '+fileName+'<br />');
    },
    onAjaxError: function(a, event, ajaxPackage) {
      console.log('maybeProgress onAjaxError: ajaxPackage:', ajaxPackage);
      var errorHtml = '<div>AJAX error 🙁 !<br /><div style="margin-left: 2em;">url: '+ajaxPackage.url
      +'<br />data: '
      +(JSON.stringify(ajaxPackage.data, null, 4)).replace(/(?:\r\n|\r|\n)/g, '<br />').replace(/\\n/g,'').replace(/    /g,'&emsp;')
      +'<br />textStatus: '+ajaxPackage.textStatus+'<br />errorThrown: '+ajaxPackage.errorThrown
      +'<br />jqXHR: '
      +(JSON.stringify(ajaxPackage.jqXHR, null, 4)).replace(/(?:\r\n|\r|\n)/g, '<br />').replace(/\\n/g,'').replace(/    /g,'&emsp;')
      +'<br /></div></div>';
      // do it this way with a single string because otherwise .append tries to "help" by inserting extra html.
      $('#progressText').append(errorHtml);
    },
    documentHasVersions: function(a, event, count) {
      console.log('checkDocumentHasNoVersionCopies: documentId: ', a.documentId, ' has ', count, ' versions.');
      var errorHtml = 'Document '+a.documentId+' has '+count+' version '+((count > 1)?'copies':'copy')+'.<br />';
      errorHtml += 'It cannot be moved or deleted. Quitting.<br />';
      $('#progressText').append(errorHtml);
    },
    notDeletingAsset: function(a, event) {
      console.log('deleteAssetFolder: not deleting asset folder.');
      $('#progressText').append('Not deleting assets, still needed. ');
    },
    nonXmlReturn: function(a, event) {
      $('#progressText').append('Server response is not XML. Quitting.');
    }
  };

  function submitForm2() { // called when submit button is pressed on form
    var a = aGeneric(callSequence0);
    a.$form = $('#fileUploadForm');
    L$.startSequence(a);
    return false; // MUST return false or chaos ensues, browser reloads with POST.
  }
  function submitUp2Form() { // called when submit button is pressed on form
    var a = aGeneric(moveFromMediaFerryCallSequence);
    L$.startSequence(a);
    return false; // MUST return false or chaos ensues, browser reloads with POST.
  }

  // this bizarre code below tried to implement // https://stackoverflow.com/questions/2066162/how-can-i-get-the-button-that-caused-the-submit-from-the-form-submit-event
  // but that doesn't work in firefox, which does not support document.activeElement
  // So I implemented .on('click') for all of the submit buttons
  // and also did onsubmit in the html above to be able to cancel the automatic form GET.
  $('#documentForm .class1').on('click', function(event) {
    $button = $(event.target);
    $form = $(event.target).parent();
    submitDocumentForm2($form, $button);
  });

  function submitDocumentForm2($form, $button) {
    // generic handler for various submit buttons on one form.
    // var $button = $(document.activeElement);
    operation = $button.data('operation');
    var sequences = {
      'editDocument':editCallSequence,
      'downloadPdf':pdfCallSequence,
      'downloadPackage':packageCallSequence,
      'storePdf':storeCallSequence,
      'storePackage':storeCallSequence,
      'editTemplateless':startTemplatelessCallSequence,
      'findAssetInfo':assetInfoCallSequence,
      'moveToMediaFerry':moveToMediaFerryCallSequence,
      'fetchPdf':fetchPdfSequence,
      'fetchZipPackage':fetchZipSequence
    };
    var callSequence = sequences[operation];
    if (typeof callSequence == 'undefined') { console.log('submitDocumentForm2: button: ', $button[0], '; operation: ', operation, 'UNRECOGNISED'); }
    var a = aGeneric(callSequence);
    a.documentId = $form.find('.documentId').val()
    switch (operation) {
      // do any custom per-operation init here
      default:
      break;
    }
    L$.startSequence(a);
    return false; // MUST return false or chaos ensues.
  }

  function submitAdminForm($form) {
    L$.startSequence(aGeneric(adminCallSequence));
    return false;
  }

  function submitTemplatedForm($form) {
    var a = aGeneric(templatedCallSequence);
    a.$form = $form;
    a.template = {
      tags: $form.find('#tagField').val(), // tags are plain text separated by spaces. Punctuation counts as space.
      name: $form.find('#templateName').val(),
      description: $form.find('#descriptionText').val()
    };
    L$.startSequence(a);
    return false;
  }

  function submitListForm($form) {
    var a = aGeneric(listTemplatesCallSequence);
    L$.startSequence(a);
    return false;
  }

  var callSequenceEdit = [
    // open the Flash editor knowing the document project Id. a.documentId must be the document Proejct Id.
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

  function displayTemplates(a) {
    var $templates = a.$xml.find('template'); // a jquery object containing all of the templates.
    $('#listTemplatesHere').html('<div class="templateGrid"></div>');
    $templates.each(function(i,e){
      $template = $(e);
      var templateId = $template.children('id').text();
      var description = $template.children('description').text(); // and not document.description
      var name = $template.children('name').text();
      var previewBase64 = $template.children('document').children('preview').text();
      var image = new Image();
      image.src = 'data:image/jpg;base64,'+previewBase64;
      var $box=$('<div class="oneBox"><div class="boxText"><b>'+name+'</b>'+'<br />'+description+'</div></div>')
      var $image = $(image);
      $image.css('margin', '0.5vw').css('margin-top', 0).css('z-index', '10');
      $box.prepend($image);
      // DO NOT FORGET that data- attributes are all lower case.
      var $button = $('<div class="bottomRight"><input class="startButton" type="submit" data-templateid="'+templateId+'" value="Start" /></div>');
      $box.append($button);
      $box.find('.startButton').on('click', function(event){
        console.log('click target:', event.target);
        var templateId = $(event.target).data('templateid');
        var a = {
          callSequence: startTemplateCallSequence,
          genericEvents: genericEvents,
          templateId: templateId
        }
        L$.startSequence(a);
      });

      $('.templateGrid').append($box);
    });
    L$.passOn(a);
  }

  $(document).ready(function() {

    // definitely have to use .ready() here or all is chaos
    // because otherwise this code tries to run before callServer.js has loaded and the L$ library is a complete mess.
    // L$.logoutFromServer({}); // have already established one2edit session in old code. Log  out that session, force a new one to test new code.

    $(window).on('unload', function(){ console.log('unload running'); L$.logoutFromServer({}); }) // Must logout on leaving this page or we'll run out of one2edit licences.

    callSequenceUploadMaster = [
      {f:L$.startSession, stage: 'Logging In'},
      {f:L$.findAssetProjectId, stage: 'Finding Asset Project ID'},
      {f:L$.submitForm, stage:'Uploading zip file'},
      {f:L$.doUnzipAtServer, stage:'Unzipping file'},
      {f:L$.doSearchForInddFile, stage:'Searching for InDesign file'},
      {f:L$.findUploadedMastersFolderId, stage: 'Finding UploadedMasters folder'},
      {f:L$.doCreateProject, stage:'Creating editable document from InDesign file'},
      {f:L$.doAddContentGroup, stage:'Creating the Editable Content Group'},
      {f:L$.doPopulateContentGroup, stage:'Moving content into the Editable Content Group'},
      {f:setDocumentId, stage:'Setting Document ID'}
    ];
    // This sequence is handled in order by the library API calls in callServer.js
    // Create a shallow copy of the basic upload-and-create-document flow, then log out.
    callSequence0 = callSequenceUploadMaster.concat([{f:L$.logoutFromServer, stage:'Logging out from server'}]); // creates new array, does not modify arguments

    editCallSequence = [
      {f:L$.startSession, stage: 'Logging In'},
      {f:L$.editDocument, stage: 'Editing Document'} // ending this does logout anyway
    ];

    adminCallSequence = [
      {f:L$.startSession, stage: 'Logging In'},
      {f:L$.openAdmin, stage:'opening Administration interface'} // ending this does logout anyway.
    ];

    pdfCallSequence = [
      {f:L$.startSession, stage: 'Logging In'},
      {f:L$.downloadPdf, stage: 'Downloading PDF'},
      {f:L$.logoutFromServer, stage:'Logging out from server'}
    ];

    packageCallSequence = [
      {f:L$.startSession, stage: 'Logging In'},
      {f:L$.downloadPackage, stage: 'Downloading Package'},
      {f:L$.logoutFromServer, stage:'Logging out from server'}
    ];

    storeCallSequence = [
      {f:L$.storeFileAtMediaFerryServer, stage: 'Storing File at MediaFerry Server'}
    ];

    // Create a shallow copy of the basic upload-and-create-master flow, then do the template
    var extraCallSequence = [
      {f:L$.findUploadedTemplatesFolderId, stage: 'Finding UploadedTemplates folder'},
      {f:L$.findUploadedWorkflowsFolderId, stage: 'Finding UploadedWorkflows folder'},
      {f:L$.findTemplatedWorkflow, stage: 'Finding TemplatedWorkflow'},
      {f:L$.createTemplate, stage: 'Creating Template'},
      {f:L$.logoutFromServer, stage:'Logging out from server'}
    ];
    templatedCallSequence = callSequenceUploadMaster.concat(extraCallSequence);

    listTemplatesCallSequence = [
      {f:L$.startSession, stage: 'Logging In'},
      {f:L$.findUploadedTemplatesFolderId, stage: 'Finding UploadedTemplates folder'},
      {f:L$.listTemplates, stage: 'Listing templates'},
      {f:displayTemplates, stage: 'Displaying Templates'},
      {f:L$.logoutFromServer, stage:'Logging out from server'}
    ];

    startTemplateCallSequence = [
      {f:L$.startSession, stage: 'Logging In'},
      {f:L$.startTemplate, stage: 'Starting Template'},
      {f:L$.editJob, stage: 'Editing version copy'}, // will logout on completion
      {f:L$.startSession, stage: 'Logging In'},
      {f:L$.makeVersionCopyMainDocument, stage: 'making version copy into main document'},
      {f:L$.removeWorkflow, stage: 'Removing workflow from document'}, // removes from main document
      {f:L$.logoutFromServer, stage:'Logging out from server'}
    ];

    startTemplatelessCallSequence = [
      {f:L$.startSession, stage: 'Logging In'},
      {f:L$.findUploadedWorkflowsFolderId, stage: 'Find UploadedWorkflows folder'},
      {f:L$.findTemplatelessWorkflow, stage: 'Finding templatelessWorkflow'},
      {f:L$.startTemplateless, stage: 'Starting Templateless Template Job'},
      {f:L$.editJob, stage: 'Editing master document'}, // will logout on completion
      {f:L$.startSession, stage: 'Logging In'},
      {f:L$.removeWorkflow, stage: 'Removing workflow from document'}, // removes from main document
      {f:L$.logoutFromServer, stage:'Logging out from server'}
    ];

    assetInfoCallSequence = [
      {f:L$.startSession, stage: 'Logging In'},
      {f:L$.findAssetFolderForDocument, stage: 'Finding asset folder'},
      {f:L$.logoutFromServer, stage:'Logging out from server'}
    ];

    moveToMediaFerryCallSequence = [
      {f:L$.startSession, stage: 'Logging In'},
      {f:L$.checkDocumentHasNoVersionCopies, stage: 'Checking document can be deleted'},
      {f:L$.storeZipPackageAtMF, stage: 'Storing File at MediaFerry Server'},
      {f:L$.findAssetFolderForDocument, stage: 'Finding asset folder'},
      {f:L$.deleteDocument, stage: 'Deleting document'},
      {f:L$.deleteAssetFolder, stage: 'Deleting asset folder'},
      {f:L$.logoutFromServer, stage:'Logging out from server'}
    ];

    moveFromMediaFerryCallSequence = [
      {f:L$.startSession, stage: 'Logging In'},
      {f:L$.findAssetProjectId, stage: 'Finding Asset Project ID'},
      {f:L$.uploadZipFileFromMediaFerry, stage:'Uploading zip file'},
      {f:L$.doUnzipAtServer, stage:'Unzipping file'},
      {f:L$.doSearchForInddFile, stage:'Searching for InDesign file'},
      {f:L$.findUploadedMastersFolderId, stage: 'Finding UploadedMasters folder'},
      {f:L$.doCreateProject, stage:'Creating editable document from InDesign file'},
      {f:L$.doAddContentGroup, stage:'Creating the Editable Content Group'},
      {f:L$.doPopulateContentGroup, stage:'Moving content into the Editable Content Group'},
      {f:L$.logoutFromServer, stage:'Logging out from server'},
      {f:setDocumentId, stage:'Setting Document ID'}
    ];

    // this sequence uploads a document, allows the user to edit it, and then downloads the pdf and installs it in the mediaferry proofing workflow.
    callSequenceSmartCorrect1 = [
      {f:L$.startSession, stage: 'Logging In'},
      {f:L$.findAssetProjectId, stage: 'Finding Asset Project ID'},
      {f:L$.uploadZipFileFromMediaFerry, stage:'Uploading zip file'}, // NOT YET WRITTEN
      {f:L$.doUnzipAtServer, stage:'Unzipping file'},
      {f:L$.doSearchForInddFile, stage:'Searching for InDesign file'},
      {f:L$.findUploadedMastersFolderId, stage: 'Finding UploadedMasters folder'},
      {f:L$.doCreateProject, stage:'Creating editable document from InDesign file'},
      {f:L$.doAddContentGroup, stage:'Creating the Editable Content Group'},
      {f:L$.doPopulateContentGroup, stage:'Moving content into the Editable Content Group'},
      {f:L$.noteDocumentIdInMFJob, stage:'Noting one2edit documentId in MediaFerry job database'}, // CODE INCOMPLETE IN mfAdmin.php
      {f:L$.findUploadedWorkflowsFolderId, stage: 'Find UploadedWorkflows folder'},
      {f:L$.findTemplatelessWorkflow, stage: 'Finding templatelessWorkflow'},
      {f:L$.startTemplateless, stage: 'Starting Templateless Template Job'},
      {f:L$.editJob, stage: 'Editing master document'}, // will logout on completion
      {f:L$.startSession, stage: 'Logging In'}, // because we just logged out
      {f:L$.removeWorkflow, stage: 'Removing workflow from document'},
      {f:L$.fetchPdfProof, stage: 'Fetching PDF Proof'},
      {f:L$.setMediaFerryWorkflowToProofing, stage: 'Setting MediaFerry workflow to proofing'}, // NOT YET WRITTEN
      {f:L$.logoutFromServer, stage:'Logging out from server'}
    ];

    // this sequence allwos teh user to edit a document already at one2edit, then downloads the pdf and installs it in the mediaferry proofing workflow.
    callSequenceSmartCorrect2 = [
      {f:L$.startSession, stage: 'Logging In'},
      {f:L$.findUploadedWorkflowsFolderId, stage: 'Find UploadedWorkflows folder'},
      {f:L$.findTemplatelessWorkflow, stage: 'Finding templatelessWorkflow'},
      {f:L$.startTemplateless, stage: 'Starting Templateless Template Job'},
      {f:L$.editJob, stage: 'Editing master document'}, // will logout on completion
      {f:L$.startSession, stage: 'Logging In'}, // because we just logged out
      {f:L$.removeWorkflow, stage: 'Removing workflow from document'},
      {f:L$.fetchPdfProof, stage: 'Fetching PDF Proof'},
      {f:L$.setMediaFerryWorkflowToProofing, stage: 'Setting MediaFerry workflow to proofing'}, // NOT YET WRITTEN
      {f:L$.logoutFromServer, stage:'Logging out from server'}
    ];

    // this sequence moves a document at one2edit back to MediaFerry

    callSequenceMoveToMF = [
      {f:L$.startSession, stage: 'Logging In'},
      {f:L$.checkDocumentHasNoVersionCopies, stage: 'Checking document can be deleted'},
      {f:L$.storeZipPackageAtMF, stage: 'Storing File at MediaFerry Server'},
      {f:L$.findAssetFolderForDocument, stage: 'Finding asset folder'},
      {f:L$.deleteDocument, stage: 'Deleting document'},
      {f:L$.deleteAssetFolder, stage: 'Deleting asset folder'},
      {f:L$.logoutFromServer, stage:'Logging out from server'}
    ];

    fetchPdfSequence = [
      {f:L$.fetchPdfProof, stage: 'Fetching PDF Proof'}
    ];
    fetchZipSequence = [
      {f:L$.storeZipPackageAtMF, stage: 'Fetching ZIP Package'}
    ];
  });

  // Edit a document at one2edit, uploading it from MediaFerry if needed, and download a proof.
  // if provided, 'onCompletion(a)' will be called after everything is complete, allowing teh caller to regain control.
  function smartCorrect(onCompletion) {
    if (typeof onCompletion != 'function') { onCompletion = function(a){}; }
    var a = aGeneric([]); // empty callSequence for now
    a.documentId = one2editDocumentIdNotedInMediaFerryJob(); // TO BE PROVIDED. Find documentId, if any, stored in MF database for this job. 0 => there is no documentId noted.
    var cs = (a.documentId == 0)?callSequenceSmartCorrect1:callSequenceSmartCorrect2;
    a.callSequence = cs.slice().push(onCompletion);
    L$.startSequence(a); // and that is all you have to do.
  }


  // Move a one2edit document to MediaFerry, deleting the one2edit files.
  // if provided, 'onCompletion(a)' will be called after everything is complete, allowing teh caller to regain control.
  function moveToMF(onCompletion) {
    if (typeof onCompletion != 'function') { onCompletion = function(a){}; }
    var a = aGeneric(callSequenceMoveToMF.slice().push(onCompletion));
    a.documentId = one2editDocumentIdNotedInMediaFerryJob(); // TO BE PROVIDED. Find documentId, if any, stored in MF database for this job. 0 => there is no documentId noted.
    L$.startSequence(a);
  }

</script>


</body>
</html>
