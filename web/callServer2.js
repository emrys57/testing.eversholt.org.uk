// Library of functions for calling the one2edit server API
// This code here presumes that jQuery is already loaded.

// javascript module pattern design taken from "Loose Augmentation" section of http://www.adequatelygood.com/JavaScript-Module-Pattern-In-Depth.html

// This next line tells ESlint to ignore the undeclared one2edit function, which is provided externally.
/*global one2edit:true*/

var L$ = (function(my) {

  // The functions defined below like "my.something = function(a){}" are the public part of this library, to be invoked by external code as "L$.something(a)"..
  // Functions defined like "function anyOldName(a) {}" are private and cannot be invoked from elsewhere.

  // All the functions below which are defined like "function(a){}" are designed to be chained together.
  // They mostly contain AJAX calls to the one2edit with async returns from the API.
  // "a" is an object to be passed along through all these routines, with extra data added in as needed.
  // In the AJAX async return code, the next function in "a.callSequence"
  // is called, passing along a modified version of the object "a".
  // a.callSequence = [{f, beforeStart, onDone, onSuccess, onError, beforeApiCall, onApiResponse}];
  // `f` is the function to be called in sequence.
  // "beforeStart" through "onApiResponse" are optional callback functions to be called by this code here before, during and after the execution of "f".
  // "beforeStart" is a function to be called just before "f" is called.
  // "onDone" is a function to be called just before the next function is called in the sequence, after the async API call return.
  // On returning from onDone, the next function in the callSequence will be called.
  // "onSuccess" is called when the API returns and does not give an error code.
  // "onError" is a function to be called if something goes wrong, in which case the next function in the callSequence will _not_ be called. The sequence terminates.
  // "beforeApiCall" is a function called just before the call is made to the server.
  // "onApiResponse" is a function to be called in the AJAX success routine of the API call to the server.
  // `f` must be defined. All other entries are optional, and need not be defined.
  // The optional entries may be used for progress indication and error reporting. They are called like "beforeStart(a, eventName)".
  // In addition, if `f` exists, and an event routine is not defined, the code will look in "a.genericEvents" for the appropriate routine, and call that if it exists.
  // In fact, in testing, I only ever used the genericEvents.
  // It's possible to add extra properties to each object in "a.callSequence". For example, I added a "stage" property, a text string, that the genericEvents used to indicate progress.

  // "a.sequenceIndex" is the index of the current entry in callSequence being executed.
  // "a.callSequence" is not modified by the operation.
  // If the calling code wishes to regain control at the end of the call sequence, it should place its own extra "f" at the end of "a.callSequence".

  // The calling code puts together an initial "a" object, perhaps like this:
  // var listTemplatesCallSequence = [
  //   {f:L$.startSession, stage: 'Logging In'},
  //   {f:L$.findUploadedTemplatesFolderId, stage: 'Finding UploadedTemplates folder'},
  //   {f:L$.listTemplates, stage: 'Listing templates'},
  //   {f:displayTemplates, stage: 'Displaying Templates'},
  //   {f:L$.logoutFromServer, stage:'Logging out from server'}
  // ];
  // var a = {
  //   callSequence: listTemplatesCallSequence,
  //   genericEvents: genericEvents
  // }
  // L$.startSequence(a);

  // Every external call into this library to start a sequence of operations starts here, as shown in the example above.
  my.startSequence = function(a) {
    a.sequenceIndex = -1;
    passOn(a);
  }

  // "passOn" is called to finish one of the operations in "callSequence" and start the next.
  // It also optionally makes callbacks to show how the sequence is progressing.
  function passOn(a) {
    maybeProgress(a, 'onDone');
    a.sequenceIndex += 1;
    // console.log('passOn: sequenceIndex: ', a.sequenceIndex, 'callSequence: ', a.callSequence);
    // pass on the object `a` to the next function in the sequence, if such a function exists
    if ($.isArray(a.callSequence) && (typeof a.sequenceIndex != 'undefined') && (typeof a.callSequence[a.sequenceIndex] != 'undefined') && (typeof a.callSequence[a.sequenceIndex].f == 'function')) {
      maybeProgress(a, 'beforeStart');
      (a.callSequence[a.sequenceIndex].f)(a); // this is the line that executes the next function in the sequence.
    } else {
      console.log('No more to do in sequence, finished.');
      maybeProgress(a, 'sequenceDone');
    }
  }

  // I had originally intended that "passOn" be private to this library.
  // However, if the calling code wishes to insert its own functions into the callSequence (which is a very reasonable thing to do)
  // then it needs to be able to call passOn. So I made a public version too.
  my.passOn = function(a) { passOn(a); } // eventually had to make it public

  // "maybeProgress" works out whether the progress callbacks should be to a stage-specific fucntion, or a generic function, or not at all.
  function maybeProgress(a, event, optionalExtras) {
    // if a handler is defined for the current event in the call sequence, execute it.
    // If it's not defined, look for a generic handler.
    if ((typeof a != 'undefined') && (typeof a.sequenceIndex != 'undefined') && (typeof a.callSequence != 'undefined') && (typeof a.callSequence[a.sequenceIndex] != 'undefined')) { // cope with sequenceIndex undefined, or off either end of array
      if (typeof (a.callSequence[a.sequenceIndex])[event]== 'function') {
        ((a.callSequence[a.sequenceIndex])[event])(a, event, optionalExtras);
      } else if ((typeof a.callSequence[a.sequenceIndex].f == 'function') && (typeof a.genericEvents != 'undefined') && (typeof a.genericEvents[event] == 'function')) {
        (a.genericEvents[event])(a, event, optionalExtras);
      }
    }
    // handle the special case of 'sequenceDone' which happens even though a.callSequence[a.sequenceIndex].f is undefined
    if ((event == 'sequenceDone') && (typeof a != 'undefined') && (typeof a.genericEvents != 'undefined') && (typeof a.genericEvents[event] != 'undefined')) {
      (a.genericEvents[event])(a, event, optionalExtras);
    }
  }

  my.new21sessionUrl = ''; // must be set up by calling code.


  // Start a session with the one2edit server by logging in with username and password.
  // To make the system marginally more secure, no one2edit passwords are sent from MediaFerry to the user's browser here.
  // Instead, the web service at the address defiend by the javascript variable "new21sessionUrl" is asked to do the logging in and provide a sessionId to be reused here.
  // "new21sessionURL" has to be defined outside of this library code. I have provided the file "new21session.php" for this service.

  // one2edit sessions traditionally time out in a few minutes. To avoid timeouts, don't start the session until you're ready to go,
  // with no human action needed to complete the whole callSequence.
  // Also, one2edit comes with a finite number of user licences. To avoid running out of licences (at least, until all the sessions time out)
  // make sure to log out of the session when it finishes.

  // This can ask to log in as any one2edit user, by setting a.username at entry.
  // If no username is provided, a generic API Test username will be provided instead.

  // SECURITY ISSUE: new21session.php has to check that the user here is a valid logged-in MediaFerry user
  // with permission to use the one2edit server
  // before logging in and providing the sessionId.
  // THAT AUTHORISATION CODE HAS NOT YET BEEN WRITTEN. Someone needs to go and do that.

  // TODO: make this code use the generic callServer routine, overriding URL and data.
  my.startSession = function(a) {
    // Start a session with the one2edit server, by calling the MediaFerry server and asking it to tell you the sessionId.
    var myData = {};
    if (typeof a.username == 'string') { myData.username = a.username; }
    $.ajax( {
      url: my.new21sessionUrl,
      type: "POST",
      data: myData,
      error: function(jqXHR, textStatus, errorThrown) {
        console.log('startSession: ajax error: textStatus: ', textStatus, 'errorThrown: ', errorThrown, ' jqXHR: ', jqXHR);
        if (typeof a.onAjaxError == 'function') { // optionally signal ajax error to calling function.
          (a.onAjaxError(a, jqXHR, textStatus, errorThrown));
        }
      },
      success: function(xml) {
        a.$xml = $(xml);
        a.one2editSession = {};
        // convert xml jQuery object into plain javascript object
        ['code', 'message', 'username', 'clientId', 'sessionId', 'baseUrl', 'apiUrl' ].forEach(function(e) { a.one2editSession[e] = a.$xml.find(e).text(); });
        if (a.one2editSession.code != '') {
          console.log('one2edit server login failed: code: ', a.one2editSession.code, '; message: ', a.one2editSession.message);
          maybeProgress(a, 'loginFailed');
          return;
        }
        passOn(a); // success code has to call passOn to move the callSequence on.
      }
    });
  };

  // These routines locate particular files and folders in the one2edit server.
  // The results of these lookups are placed into "a" for later routines to use. "a" accumulates extra info like this thoughout the callSequence.
  my.findUploadedMastersFolderId = function(a){
    a.type = 'document';
    a.folderName = 'UploadedMasters';
    findFolderWithName(a);
  }
  my.findUploadedTemplatesFolderId = function(a){
    a.type = 'template';
    a.folderName = 'UploadedTemplates';
    findFolderWithName(a);
  }
  my.findUploadedWorkflowsFolderId = function(a){
    a.type = 'workflow';
    a.folderName = 'UploadedWorkflows';
    findFolderWithName(a);
  }
  my.findTemplatedWorkflow = function(a) {
    a.type = 'workflow';
    a.fileName = 'templatedWorkflow';
    findFileInFolder(a);
  }

  my.findAssetProjectId = function(a) {
    my.callServer(a, {
      command: 'asset.list'
    }, function(a){
      a.one2editSession.projectId = a.$xml.find('asset').first().children('project').text(); // the asset project
      if (typeof a.one2editSession.projectId == 'undefined') {
        console.log('startSession: asset projectId not found.');
        maybeProgress(a, 'assetProject'); // Note the full custom callback routine.
        // The calling code can provide generic handlers for the cusstom callbacks. Various errors here are reported through this means.
        return;
      }
      passOn(a);
    });
  }


// TODO: use maybeProgress to pass ajax errors to a generic event handler.
  my.callServer = function(a, data, realSuccess, moreAjaxStuff) {
    // call the one2edit server.
    // the 'realSuccess' function is only called if the server does not return an error code.
    // 'data' is an array of the parameters to pass to the server.
    // callServer automatically adds the sessionId and workspaceId to 'data'.
    // `a` contains the session info and is used for logging and progress calls.
    // `moreAjaxStuff`, if present, is extra info to be added to the Ajax call. It can override the URL and data if it needs.

    var myData = {
      sessionId: a.one2editSession.sessionId,
      clientId: a.one2editSession.clientId
    };
    $.extend(myData, data);
    // console.log('callServer: ', myData);
    var ajaxCallObject = {
      url: a.one2editSession.apiUrl,
      type: "POST",
      data: myData,
      error: function(jqXHR, textStatus, errorThrown) {
        console.log('callServer: ajax error: textStatus: ', textStatus, 'errorThrown: ', errorThrown, ' jqXHR: ', jqXHR);
        if (typeof a.onAjaxError == 'function') { // optionally signal ajax error to calling function. Provide this function if you need it.
          (a.onAjaxError(a, jqXHR, textStatus, errorThrown));
        }
      },
      // bizarrely, the
      success: function(returnedData, textStatus, jqXHR) { // eslint-disable-line no-unused-vars
        a.$xml = $(returnedData); // the is the only way I can make sense of the weird returned object https://stackoverflow.com/questions/19220873/how-to-read-xml-file-contents-in-jquery-and-display-in-html-elements
        // console.log('callServer: success: returnedData:', returnedData);
        maybeProgress(a, 'onApiResponse');
        var code = a.$xml.find('error').children('code').text();
        if (code != '') { // then an error code has been returned at the top level of the API call
          var message = a.$xml.find('message').text();
          console.log('callServer: server returned error: code: ', code, '; message: ', message);
          maybeProgress(a, 'onError');
          return;
        }
        maybeProgress(a, 'onSuccess');
        if (typeof realSuccess != 'undefined') {
          realSuccess(a); // when realSuccess is called, the API hasn't reported an error, AJAX hasn't reported an error, and the XML returned data is in a.$xml
        } else {
          passOn(a); // default if no success function is specified.
        }
      }
    }
    if (typeof moreAjaxStuff == 'object') { $.extend(ajaxCallObject, moreAjaxStuff); }
    maybeProgress(a, 'beforeApiCall', ajaxCallObject);
    // console.log('callServer: beforeApiCall:', ajaxCallObject);
    $.ajax(ajaxCallObject);
  }



  // https://stackoverflow.com/questions/2320069/jquery-ajax-file-upload
  // This uploads a file. Change this to give a progress bar on upload and drag-and-drop functionality.
  // The zip file ends up in the "asset space", where uplaoded files live at one2edit.
  // While other one2edit files are defined by folderId and fileId numbers,
  // the asset space uses a full text pathName. I don't know why.
  // Tihs routine outputs that pathName to "a.zipFileIdentifier".
  my.submitForm = function(a) {
    // at entry,
    // a.$form is the jQuery object that is the upload form.
    // https://stackoverflow.com/questions/6974684/how-to-send-formdata-objects-with-ajax-requests-in-jquery?noredirect=1&lq=1
    // console.log('submit event');
    var fd = new FormData(a.$form[0]);
    fd.append('sessionId', a.one2editSession.sessionId);
    fd.append('clientId', a.one2editSession.clientId);
    fd.append('command', 'asset.upload');
    fd.append('projectId', a.one2editSession.projectId);
    fd.append('folderIdentifier', '/UploadedPackages');
    var realSuccess = function(a) {
      // console.log('submitForm: success: data:', a.$xml[0]);
      a.zipFileIdentifier = a.$xml.find('identifier').text(); // a full pathname in the asset space
      passOn(a);
    }
    my.callServer(a, {}, realSuccess, { // extra info for the Ajax call here
      processData: false, // tell jQuery not to process the data
      contentType: false, // tell jQuery not to set content type
      data: fd // override data constructed by callServer, it has to be just fd and nothing else.
    });
  }

  // ask one2edit to unzip the file just uploaded.
  // the zip file is at "a.zipFileIdentifier" at entry.
  // We also need to have done L$.findAssetProjectId before coming ehre, to set a.one2editSession.projectId
  // This routines output the full asset space pathname of the unzipped folder to "a.extractedFolderIdentifier".
  // DO remove the zipfiles as they are uploaded. Two zip files are not allowed to have the same name, and removing them after unzip mostly stops this.
  my.doUnzipAtServer = function(a) {
    my.callServer(a, {
      command: 'asset.extract',
      projectId: a.one2editSession.projectId, // that is the asset project
      identifier: a.zipFileIdentifier, // left behind by the upload command
      remove: true // we definitely want to remove the zip file
    }, function(a) {
      // console.log('doUnzipAtServer: success: xml:', a.$xml[0]);
      a.extractedFolderIdentifier = a.$xml.find('identifier').text(); // the complete file path, in the asset space, of the extracted folder
      passOn(a);
    });
  }

  // Hunt down the .indd file within the folders created by unzipping an InDesign package.
  // Recursively search through any folders for the first .indd file.
  // At entry, "a.extractedFolderIdentifier" should point to the extracted package to be searched.
  my.doSearchForInddFile = function(a) {
    var foundInddFile = false; // global, first descendant to find file sets it for all
    // Have a separate function for the search to cope with the recursion.
    searchForInddFile(a, a.extractedFolderIdentifier);

    function searchForInddFile(a, folderIdentifier) {
      // 'folderIdentifier' is a complete file path in the asset space
      // find the files and folders in that folder.
      // this function can call itself recursively to go deeper into the asset folder tree.
      var callServerData = {
        command: 'asset.list',
        folderIdentifier: folderIdentifier,
        projectId: a.one2editSession.projectId
      };
      // console.log('searchForInddFile: Folder: ', folderIdentifier, ' ', callServerData);

      my.callServer(a, callServerData, function(a) {
        var $allFiles = a.$xml.find('asset').children('type:contains("file")').parent(); // file assets
        $allFiles.each(function(i,e) {
          var $asset = $(e);
          if ($asset.children('name').text().match(/\.indd$/i) != null) { // it is an InDesign file
            foundInddFile = true;
            a.$asset = $asset;
            passOn(a);
            return false; // same as 'break'
          }
        });
        if (!foundInddFile) { // file is not in this folder, look in subfolders
          var $allFolders = a.$xml.find('asset').children('type:contains("folder")').parent();
          $allFolders.each(function(i,e) { // this function called for each subfolder
            var newFolderIdentifier = $(e).find('identifier').text();
            searchForInddFile(a, newFolderIdentifier);
            if (foundInddFile) { return false; } // same as break
          });
        }
      });
    }
  }


  // one2edit "project documents" (or maybe just "projects") are different from the uplaoded InDesign packages.
  // This routine creates a project from an InDesign package.
  // It typically takes about 10s to run.
  // At entry, a.$asset has to be the xml defining the .indd file in the one2edit asset space.
  // Also I already have to have found the projectId and the UploadedMasters folder in the project space.
  // At exit, a.$document contains the xml defining the created project document.
  my.doCreateProject = function(a) {
    // transform the InDesign file in the asset space into an editable project in the one2edit document space.
    // a.$asset is the result of 'asset.list' and contains just the asset we want to convert.
    var assetIdentifier = a.$asset.find('identifier').text();
    // console.log('doCreateProject: with asset:', assetIdentifier);
    my.callServer(a, {
      command: 'document.link',
      assetProjectId: a.one2editSession.projectId,
      assetIdentifier: assetIdentifier,
      folderId: a.one2editSession.folderId['document'] // where to create the new document
    }, function(a) {
      // console.log('doCreateProject: success: ', a.$xml[0]);
      a.$document = a.$xml.find('document');
      passOn(a);
    });
  }

  // one2edit project documents have "Content Groups" that can be used to define bits of the document to be edited.
  // We use "Editable Content Group" to define this, and this routine adds that content group to the project document, and leaves the content group empty.
  // At entry, a.$document contains the xml defining the one2edit project document.
  // At exit, a.toGroupId is the ID of the newly created content group.
  // TODO: modify callServer to allow the 4004 error to be ignored.
  my.doAddContentGroup = function(a) {
    // Add the 'Editable Content Group' which is the expected one for our workflows
    // if the group already exists (somehow) we get a code-4004 error, which we can ignore.
    // Except we don't yet, which is a mssing feature. Have to allow it in callServer.
    // 'a.$document' is the result of a call to 'doCreateProject'
    // console.log('doAddContentGroup: initially: document:', a.$document[0]);
    a.documentId = a.$document.children('id').text(); // there is a document.owner.id too; don't want that one.
    my.callServer(a, {
      command: 'document.group.add',
      documentId: a.documentId,
      name: 'Editable Content Group'
    }, function(a) {
      a.toGroupId = a.$xml.find('success').children('group').children('id').text();
      passOn(a);
    });
  }

  // Move any content from an editable layer to the Editable Content Group just created.
  // 'a.toGroupId' contains the response to a 'document.group.add' API call. a.$document is the document.
  // All of any layer whose name starts "Editable" is moved to the Editable Content Group.
  my.doPopulateContentGroup = function(a) {
    // I cannot filter the layers by name with a regular expression. I need to list the layers and sort out which ones I want here.
    // console.log('doPopulateContentGroup: toGroupId: ', a.toGroupId, '; documentId: ', a.documentId);
    my.callServer(a, {
      command: 'document.layer.list',
      documentId: a.documentId
    }, function(a) {
      // console.log('doPopulateContentGroup: layer.list success: xml: ', a.$xml[0]); // we have a successful API call result
      var $allLayers = a.$xml.find('layer');
      var editableLayersXml = '';
      $allLayers.each(function(i, e) {
        var $layer = $(e);
        var name = $layer.find('name').text();
        var editable = (name.match(/^editable/i) != null); // any layer starting with 'editable', case-independent, is matched
        console.log('allLayers.each: name: ', name, '; editable: ', editable);
        if (editable) { // then include this layer in the content filter for moving into the Content Group
          var layerId = $layer.find('id').text();
          editableLayersXml = editableLayersXml + ' <id>' + layerId + '</id> '; // accumulate layer filter xml text.
        }
      });
      console.log('editableLayersXml: ', editableLayersXml);
      if (editableLayersXml == '') { // no editable layers, warn the user, special callback for this function only
        maybeProgress(a, 'noEditableLayers');
        passOn(a);
      }
      var filterXml = '<filters> <itemlayer> ' + editableLayersXml + ' </itemlayer> </filters>';
      var serverData = {
        command: 'document.group.item.move',
        documentId: a.documentId,
        toGroupId: a.toGroupId,
        filter: filterXml // the filter determines what content is moved
      };
      my.callServer(a, serverData, function(a) {
        // console.log('moveItemsToContentGroup: serverData: ', serverData, 'responseXml:', a.$xml[0]);
        passOn(a);
      });
    });
  }

  // This library code here usually executes at the user's browser.
  // Sometimes we need to move files not from one2edit to the broser, but from one2edit to the MediaFerry server.
  // This routine calls another PHP helper to do this, 'fetchfile.php', which needs to run at the MediaFerry server.
  // SECURITY NOTE: fetchfile.php needs to check that the user is permitted to see the data and use the one2edit server.
  // THAT CODE HAS NOT YET BEEN WRITTEN. Someone should write it.
  // You don't need to have logged in to one2edit to run this routine.
  // At entry, a.store = {fileType, documentId} defines the document to be downloaded.
  // At exit, a.store.storedFilePathAtMediaFerry holds the path to the stored file at MediaFerry.
  // This code works for 'pdf' and 'package' types.
  my.storeFileAtMediaFerryServer = function(a) {
    a.one2editSession = {}; // have to have an empty session if I am to use callServer
    if (typeof a.store != 'object') { a.store = {}; } // that would be a bug
    var extension = '';
    if (a.store.fileType == 'pdf') { extension = '.pdf'; }
    if (a.store.fileType == 'package') { extension = '.zip'; }
    var myData = {
      fileType: a.store.fileType,
      documentId: a.store.documentId,
      filename: 'document'+a.store.documentId+extension
    }
    my.callServer(a, {}, function(a){
      a.store.storedFilePathAtMediaFerry = a.$xml.find('filePath').text();
      console.log('downloadFileToMediaFerryServer: downloadedFilePathAtMediaFerry: ', a.store.storedFilePathAtMediaFerry);
      passOn(a);
    }, {
      data: myData,
      url:'fetchFile.php'
    });
  }

  // these routines download files to the user's browser.
  my.downloadPdf = function(a) {
    a.downloadCommand = 'document.export.pdf';
    downloadFile(a);
  }

  my.downloadPackage = function(a) {
    a.downloadCommand = 'document.export.package';
    downloadFile(a);
  }

  function downloadFile(a) {
    // How do I log out of this session when downloading PDF?
    // If I log out instantly, then the new tab I have just opened will not have a valid sessionId.
    // Setting a timemout doesn't work because the session is checked both at the start of the operation and the end.
    // I could send the username and password but I have been desperately trying to avoid that.
    // Create a new session and use that? And hope it doesn't use edit licences?
    // I don't want to retain session indefinitely in this code because they have a habit of timing out at the most embarrassing moments.
    // I don't mind leaving the extra sessions used for downlaod to time out. They don't seem to use one2edit licences
    // and the timeout is long enough for the downlaod to complete.

    function startDownload(a3) {
      // start the download once we have a new session
      var url = a3.one2editSession.apiUrl;
      var parameters = { // document.export.pdf&authDomain=local&clientId=123&id=1&result=asset&assetProjectId=123&assetFolderIdentifier=tmp&assetName=file.pdf
        command: a3.downloadCommand,
        authDomain: 'local',
        clientId: a3.one2editSession.clientId,
        id: a3.documentId,
        result: 'file',
        sessionId: a3.one2editSession.sessionId
      }
      var p2 = [];
      Object.keys(parameters).forEach(function(e) { p2.push(encodeURIComponent(e)+'='+encodeURIComponent(parameters[e])); })
      url += '?' + p2.join('&');
      console.log('startDownload: url: ', url);
      window.open(url,'_blank');
      window.focus(); // https://stackoverflow.com/questions/7924232/how-to-open-new-tab-in-javascript-without-switching-to-the-new-tab
      passOn(a3);
    }

    // If you need to start a second callSequence while the first is still running,
    // magic up a new copy of "a" and call "startSequence" on it.
    // This routine here goes back to the first sequence.
    // It seems to be picking up a global copy of "a". Ah, this is all within 'downloadFile', and "a" is global within that.
    // TODO:  Actually, push and pop it, like "a2.aPushed = a"
    // and passOn(a2.aPushed).
    function goBackToFirstSequence(a4) { // eslint-disable-line no-unused-vars
      // pick up the first sequence from the enclosing function scope, and restart that. Unbelievably, it works perfectly.
      // this is how you do subroutines using this callSequence idea.
      // I could actually do this quite neatly. Have a push and pop operation on `a`.
      passOn(a); // a, not a4
    }

    var a2 = {
      callSequence: [
        {f:my.startSession, stage:'Logging in second session'},
        {f:startDownload, stage:'starting download in second session'}, // and then do not log out
        {f:goBackToFirstSequence, stage:'going back to first sequence'}
      ],
      username: a.one2editSession.username,
      genericEvents: a.genericEvents,
      documentId: a.documentId,
      downloadCommand: a.downloadCommand
    }
    my.startSequence(a2);
    console.log('downloadPdf: started second sequence: a2:', a2); // never reaches here!
  }

  //open the one2edit flash editor.
  // shared between the document editor, the job editor and the admin desktop.
  // log out on exit to avoid leaving a licence behind to time out.
  function openFlash(a, ap) { // open the Flash editor
    console.log('openFlash: ap: ', ap);
    maybeProgress(a, 'adjustDisplayForFlash');
    var ap0 = {
      options: {
        onLogout: function() {
          maybeProgress(a, 'adjustDisplayAfterFlash');
          console.log('calling one2edit.destroy'); // you have to destroy the one2edit instance, it cannot be reused.
          one2edit.destroy();
          console.log('called one2edit.destroy');
          passOn(a);
        }
        // perhaps do something else after closing editor and sliding window up is finished
      },
      parameters: { wmode: 'opaque' },
      flashvars: {
        server: a.one2editSession.baseURL,
        sessionId: a.one2editSession.sessionId, // A sessionId is returned when we authenticate a user (see API example)
        clientId: a.one2editSession.clientId, // Id of our Client Workspace
        idleTimeout: 900,
        editor: {
          closeBehavior: one2edit.editor.CLOSE_BEHAVIOR_LOGOUT,
        },
        jobEditor: {
          // need an empty object here, and not just a missing jobEditor, because one2edit does not properly delete settings on one2edit.destroy
        }
      }
    };
    var ap2 = $.extend(true, {}, ap0, ap); // deep copy
    console.log('openFlash: ap2: ', ap2);
    one2edit.create(ap2);
  }

  my.editDocument = function(a) {
    console.log('editDocument: documentId: ', a.documentId);
    openFlash(a, {
      flashvars: {
        editor: {
          documentId: a.documentId
        }
      }
    });
  };

  my.editJob = function(a) { // open the editor for the template job specified by jobId
    console.log('editJob: jobId: ', a.jobId);
    openFlash(a, {
      flashvars: {
        jobEditor: {
          jobId: a.jobId
        }
      }
    });
  }

  my.openAdmin = function(a) { // open the admin interface
    openFlash(a,{}); // that's all. No editor => admin interface
  }

  // log out (if we're logged in) and delete the memory of the session in "a" to avoid the bug of reusing an expired session.
  my.logoutFromServer = function(a) {
    if ((typeof a != 'undefined') && (typeof a.one2editSession != 'undefined') && (typeof a.one2editSession.sessionId != 'undefined') && (a.one2editSession.sessionId != '')) {
      my.callServer(a, {
        command: 'user.session.quit'
      },
      function(a) {
        delete a.one2editSession; // note that the session is finished.
        passOn(a);
      });
    }
  }

  // Find various files and folders within the one2edit server
  function findTemplatelessWorkflow1(a) {
    a.folderName = 'UploadedWorkflows';
    a.type = 'workflow';
    findFolderWithName(a);
  }

  function findTemplatelessWorkflow2(a) {
    a.fileName = 'TemplatelessWorkflow';
    a.type = 'workflow';
    findFileInFolder(a);
  }

  // TODO: implement https://stackoverflow.com/questions/2338439/select-element-based-on-exact-text-contents
  function findFolderWithName(a) {
    // type is 'workflow', 'template' or 'document'
    delete a.$folder;
    my.callServer(a, {
      command: a.type+'.folder.list',
      depth: 0 // recurse indefinitely
    }, function(a) {
      var selector = 'name:contains('+a.folderName+')';
      var $folders = a.$xml.find('folder').children(selector).parent();
      $folders.each(function(i,e) {
        // this makes sure we don't have multiple folders containg this text.
        var $folder = $(e);
        if ($folder.children('name').text() == a.folderName) {
          a.$folder = $folder;  // old code
          if (typeof a.one2editSession.folderId == 'undefined') { a.one2editSession.folderId = []; }
          a.one2editSession.folderId[a.type] = $folder.children('id').text();  // retain folder Id for each type, potentially
        }
      });
      if (typeof a.$folder == 'undefined') {
        console.log('findFolderWithName: folder not found: ', '/'+a.folderName);
        maybeProgress(a, 'cannotFindFolder', a.folderName);
        return;
      }
      passOn(a); // which we hope has the folder in it.
    });
  }

  function findFileInFolder(a) {
    // a.type is 'workflow', 'template' or 'document'
    // folderId for the type has been previously set up
    var folderId = a.one2editSession.folderId[a.type];
    delete a.$file;
    my.callServer(a,{
      command: a.type+'.list',
      folderId: folderId
    }, function(a) {
      var $files = a.$xml.find('name:contains("'+a.fileName+'")').parent();
      $files.each(function(i,e) {
        // this makes sure we don't have multiple files containg this text.
        var $file = $(e);
        if ($file.children('name').text() == a.fileName) {
          a.$file = $file;  // old code
          if (typeof a.one2editSession.fileId == 'undefined') { a.one2editSession.fileId = []; }
          a.one2editSession.fileId[a.type] = $file.children('id').text();  // retain file Id for each type, potentially
        }
      });
      if (typeof a.$file == 'undefined') {
        console.log('findFileWithName: file not found: ', a.fileName);
        maybeProgress(a, 'cannotFindFile', a.fileName);
        return;
      }
      passOn(a); // which we hope has the file in it.
    });
  }

  // This routine starts a template job involving a master document and a workflow without ever needing a template.
  // The disadvantage is that it cannot have any tags.
  function startTemplatelessTemplateJobReally(a) {
    console.log('startTemplatelessTemplateJobReally: a: ', a, '; xmlPassedIn:', a.$xml[0]);
    a.workflowId = a.$file.children('id').text();
    a.newDocumentName = a.$document.children('name').text() + ' Version Copy';
    var ap = {
      command: 'template.start',
      documentName: a.newDocumentName,
      documentId: a.documentId,
      workflowId: a.workflowId
    }
    my.callServer(a, ap, function(a){
      a.$job = a.$xml.find('jobs').find('status:contains("STARTED")').first().parent(); // first started job
      a.jobId = a.$job.children('id').text();
      passOn(a);
    }, '.startTemplatelessTemplateJobReally');
  }


  my.startTemplatelessTemplateJob = function(a) {
    var callSequence1 = [
      {f:findTemplatelessWorkflow1, stage:'Finding workflow folder'},
      {f:findTemplatelessWorkflow2, stage:'Finding templateless workflow'},
      {f:startTemplatelessTemplateJobReally, stage:'Starting job'},
      {f:my.editJob, stage:'Editing job'}
    ];
    a.callSequence = callSequence1; // NOTE destroys existing callSequence
    my.startSequence(a);
  };

  // data for a new template linking a master document and a workflow comes from a form in teh demo html page.
  // At entry, a.template = {name, tags, description}
  // and a.documentId is the master document
  // and the workflow Id has already had to have been found.
  my.createTemplate = function(a) {
    // create a template which links a.documentId to a.one2editSession.fileId['workflow']
    // with the name, tags and description specified in the file upload form.
    var workflowData = '<workflowData><workflow id="'+a.one2editSession.fileId['workflow']+'" default="true"></workflow></workflowData>';
    console.log('createTemplate: workflowData:', workflowData);
    my.callServer(a, {
      command: 'template.add',
      folderId: a.one2editSession.folderId['template'],
      name: a.template.name,
      tags: a.template.tags,
      description: a.template.description,
      documentId: a.documentId, // the master document
      workflowData: workflowData
      // workflowData: '<?xml version="1.0" encoding="utf-8"?><workflowData><workflow id="'+a.one2editSession.fileId['workflow']+'"></workflow></workflowData>'
    }, function(a) {
      // actually nothing to do
      passOn(a);
    });
  }

  // list all the templates in teh UploadedTempaltes folder, complete wtih jpeg thumbnails.
  // you have to have located UploadedTemplates before coming here.
  my.listTemplates = function(a) {
    // list all the templates in the UploadedTemplates folder, which must already have been found.
    my.callServer(a, {
      command: 'template.list',
      folderId: a.one2editSession.folderId['template'],
      includeDocumentInfos: true,
      includeDocumentPreviews: true,
      includeDocumentMetadata: true
    }, function(a) {
      // a.$xml is the data returned. Maybe we'll just have a look at it for the moment.
      a.$xml.each(function(i,e){
        console.log('template: ', e);
      });
      passOn(a);
    });
  }


  // This starts a template job, meaning, executes the workflow for the template.
  // It creates a version copy of the master document and creates the job.
  // At entry, a.tempalteId is the template to be started. That defines everything else.
  // At exit, a.jobId is the job jsut started, and a.versionCopyDocumentId is the verison copy just created.
  my.startTemplate = function(a) {
    // Terrible trouble trying to select the right job in jQuery
    // which is why there is such a clunky filter mechanism below, and so many commented out logging statements.
    // but it finally seems to work.
    console.log('startTemplate: trying to start template:', a.templateId);
    my.callServer(a,{
      command: 'template.start',
      id: a.templateId,
      mode: 'VERSION'
    },function(a){
      // console.log('startTemplate: realSuccess: xml: ', a.$xml[0]);
      var $document = a.$xml.find('document'); // that is the version copy, not the master document
      a.versionCopyDocumentId = $document.children('id').text();
      var $jobs = a.$xml.find('job');
      $jobs.each(function(i,e) { console.log('startTemplate: job:', i,':',e ); });
      var $jobStarted = $jobs.filter(function(){
        var statusText = $(this).find('status').text();
        var truth = (statusText == 'STARTED');
        // console.log('filter: status:', statusText, truth);
        return truth;
      })
      a.jobId = $jobStarted.children('id').text();
      // console.log('startTemplate: jobId: ', a.jobId, '; jobStarted: ', $jobStarted[0]);
      passOn(a);
    });
  }

  // On ending job editing, Tariq wants all the fields set to read-to-review, and this rotuine does just that.
  my.setAllItemsToNeedsReview = function(a) {
    console.log('setAllItemsToNeedsReview: versionCopyDocumentId: ', a.versionCopyDocumentId);
    my.callServer(a, {
      command: 'document.workflow.commit',
      documentId: a.versionCopyDocumentId,
      toStatus: 'NEEDSREVIEW'
    }); // no realSuccess fucntion, automatic passOn used.
  }

  return my;
}(L$ || { nameSpace: 'L$' }));
