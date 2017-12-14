// Library of functions for calling the server API
// This code here presumes that jQuery is already loaded.


// javascript module pattern design taken from "Loose Augmentation" section of http://www.adequatelygood.com/JavaScript-Module-Pattern-In-Depth.html

var L$ = (function(my) {
  // There is a bug in the chrome clear-cache-and-reload button. It sometimes gives very bizarre results when testing this code.
  // Hitting shift-reload in firefox seems entirely reliable, though.

  // All the functions below which are defined like function(a) are designed to be chained together.
  // They mostly contain async returns from the API. In the async return code, the next function in a.callSequence
  // is called, passing along a modified version of the object `a`.
  // a.callSequence = [{f, beforeStart, onDone, onSuccess, onError, beforeApiCall, onApiResponse}];
  // `f` is the function to be called in sequence.
  // beforeStart is a function to be called just before thisFunction is called.
  // onDone is a function to be called just before the next function is called in the sequence, after the async API call return.
  // On returning from onDone, the next function in the callSequence will be called.
  // onSuccess is called when the API returns and does not give an error code.
  // onError is a function to be called if something goes wrong, in which case the next function in the callSequence will _not_ be called. The sequence terminates.
  // beforeApiCall is a fucntion called just before the call is made to the server.
  // onApiResponse is a function to be called in the success routine of the API call to the server.
  // `thisFunction` must be defined. All other entries are optional, and need not be defined.
  // The optional entries may be used for progress indication and error reporting. They are called like function() (a, eventName).
  // In addition, if `f` exists, and an event routine is not defined, the code will look in a.genericEvents for the appropriate routine, and call that if it exists.
  // a.sequenceIndex points to the current entry in callSequence being executed.
  // a.callSequence is not modified by the operation.
  // If the calling code wishes to regain control at the end of the call sequence, it should place its own extra thisFunction at the end of a.callSequence.

  my.startSequence = function(a) {
    a.sequenceIndex = -1;
    passOn(a);
  }

  function passOn(a) {
    maybeProgress(a, 'onDone');
    a.sequenceIndex += 1;
    // console.log('passOn: sequenceIndex: ', a.sequenceIndex, 'callSequence: ', a.callSequence);
    // pass on the object `a` to the next function in the sequence, if such a function exists
    if ($.isArray(a.callSequence) && (typeof a.sequenceIndex != 'undefined') && (typeof a.callSequence[a.sequenceIndex] != 'undefined') && (typeof a.callSequence[a.sequenceIndex].f == 'function')) {
      maybeProgress(a, 'beforeStart');
      (a.callSequence[a.sequenceIndex].f)(a);
    } else {
      console.log('No more to do in sequence, finished.');
      maybeProgress(a, 'sequenceDone');
    }
  }

  my.passOn = function(a) { passOn(a); } // eventually had to make it public

  function maybeProgress(a, event, optionalExtras) {
    // if a handler is defined for the current event in the call sequence, execute it.
    // If it's not defined, look for a generic handler.
    if ((typeof a != 'undefined') && (typeof a.sequenceIndex != 'undefined') && (typeof a.callSequence != 'undefined ') && (typeof a.callSequence[a.sequenceIndex] != 'undefined')) { // cope with sequenceIndex undefined, or off either end of array
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

  my.startSession = function(a) {
    // Start a session with the one2edit server, by calling the MediaFerry server and asking it to tell you the sessionId.
    // Also look up uploaded masters folder ID and asset project ID because I keep failing to check them.
    var myData = {};
    if (typeof a.username == 'string') { myData.username = a.username; }
    $.ajax( {
      url: new21sessionUrl,
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
        var uploadedMastersFolderName = 'UploadedMasters';
        // convert xml jQuery object into plain javascript object
        ['code', 'message', 'username', 'clientId', 'sessionId', 'baseUrl', 'apiUrl' ].forEach(function(e) { a.one2editSession[e] = a.$xml.find(e).text(); });
        if (a.one2editSession.code != '') {
          console.log('one2edit server login failed: code: ', a.one2editSession.code, '; message: ', a.one2editSession.message);
          maybeProgress(a, 'loginFailed');
          return;
        }
        passOn(a);
      }
    });
  };

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
        maybeProgress(a, 'assetProject');
        return;
      }
      passOn(a);
    });
  }

  my.callServer = function(a, data, realSuccess, moreAjaxStuff) {
    // call the one2edit server.
    // the 'realSuccess' function is only called if the server does not return an error code.
    // 'data' is an array of the parameters to pass to the server.
    // callServer automatically adds the sessionId and workspaceId to data.
    // `a` contains the session info and is used for logging and progress calls.
    // `moreAjaxStuff`, if present, is extra info to be added to the Ajax call.


    var myData = {
      sessionId: a.one2editSession.sessionId,
      clientId: a.one2editSession.clientId
    };
    $.extend(myData, data);
    // console.log('callServer: ', myData);
    ajaxCallObject = {
      url: a.one2editSession.apiUrl,
      type: "POST",
      data: myData,
      error: function(jqXHR, textStatus, errorThrown) {
        console.log('callServer: ajax error: textStatus: ', textStatus, 'errorThrown: ', errorThrown, ' jqXHR: ', jqXHR);
        if (typeof a.onAjaxError == 'function') { // optionally signal ajax error to calling function.
          (a.onAjaxError(a, jqXHR, textStatus, errorThrown));
        }
      },
      success: function(returnedData, textStatus, jqXHR) {
        a.$xml = $(returnedData); // the is the only way I can make sense of the weird returned object
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
          realSuccess(a);
        } else {
          passOn(a); // default if no success function
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
  my.submitForm = function(a) {
    // a.$form is the jQuery object that is the upload form.
    // callSequence is an array of functions to call as each async API call completes.
    // console.log('submit event');
    var fd = new FormData(a.$form[0]);
    fd.append('sessionId', a.one2editSession.sessionId);
    fd.append('clientId', a.one2editSession.clientId);
    fd.append('command', 'asset.upload');
    fd.append('projectId', a.one2editSession.projectId);
    fd.append('folderIdentifier', '/UploadedPackages');
    realSuccess = function(a) {
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

  // That is fine, but now we are doing javascript access direct from user's browser to one2edit.
  // Using PHP to set up the session makes sense, because then the one2edit password never touches the browser.
  // It's just rather scruffy to have both javascript and php handle the one2edit API.
  // I wish I had a library to handle these APIs direct from the API definitions.

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

  my.doSearchForInddFile = function(a) {
    // a.$xml is the result of the 'asset.extract' call
    var foundInddFile = false; // global, first descendant to find file sets it for all
    // Hunt down the .indd file within the folders created by unzipping.
    // Have a separate function for the search because that function uses folder identifiers recursively, not the xml result.
    searchForInddFile(a, a.extractedFolderIdentifier);

    function searchForInddFile(a, folderIdentifier) {
      // 'folderIdentifier' is a complete file path in the asset space
      // find the files and folders in that folder.
      // this function can call itself recursively to go deeper into the asset folder tree.
      callServerData = {
        command: 'asset.list',
        folderIdentifier: folderIdentifier,
        projectId: a.one2editSession.projectId
      };
      // console.log('searchForInddFile: Folder: ', folderIdentifier, ' ', callServerData);

      my.callServer(a, callServerData, function(a) {
        $allFiles = a.$xml.find('asset').children('type:contains("file")').parent(); // file assets
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
          $allFolders = a.$xml.find('asset').children('type:contains("folder")').parent();
          $allFolders.each(function(i,e) { // this function called for each subfolder
            newFolderIdentifier = $(e).find('identifier').text();
            searchForInddFile(a, newFolderIdentifier);
            if (foundInddFile) { return false; } // same as break
          });
        }
      });
    }
  }



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

  my.doPopulateContentGroup = function(a) {
    // Move any content from an editable layer to the Editable Content Group just created.
    // 'a.toGroupId' contains the response to a 'document.group.add' API call. a.$document is the document.
    // I cannot filter the layers by name with a regular expression. I need to list the layers and sort out which ones I want here.
    // console.log('doPopulateContentGroup: toGroupId: ', a.toGroupId, '; documentId: ', a.documentId);
    my.callServer(a, {
      command: 'document.layer.list',
      documentId: a.documentId
    }, function(a) {
      // console.log('doPopulateContentGroup: layer.list success: xml: ', a.$xml[0]); // we have a successful API call result
      $allLayers = a.$xml.find('layer');
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

    // This seems to work, but downloads the files to the user's workstation instead of to the mediaferry server.
    // I need separate functions to store teh result at the MediaFerry server

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
      p2 = [];
      Object.keys(parameters).forEach(function(e) { p2.push(encodeURIComponent(e)+'='+encodeURIComponent(parameters[e])); })
      url += '?' + p2.join('&');
      console.log('startDownload: url: ', url);
      window.open(url,'_blank');
      window.focus(); // https://stackoverflow.com/questions/7924232/how-to-open-new-tab-in-javascript-without-switching-to-the-new-tab
      passOn(a3);
    }

    function goBackToFirstSequence(a4) {
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

  function openFlash(a, ap) { // open the Flash editor
    console.log('openFlash: ap: ', ap);
    maybeProgress(a, 'adjustDisplayForFlash');
    var ap0 = {
      options: {
        onLogout: function() {
          maybeProgress(a, 'adjustDisplayAfterFlash');
          console.log('calling one2edit.destroy');
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
        $folder = $(e);
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
    folderId = a.one2editSession.folderId[a.type];
    delete a.$file;
    my.callServer(a,{
      command: a.type+'.list',
      folderId: folderId
    }, function(a) {
      var $files = a.$xml.find('name:contains("'+a.fileName+'")').parent();
      $files.each(function(i,e) {
        // this makes sure we don't have multiple files containg this text.
        $file = $(e);
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

  function startTemplatelessTemplateJobReally(a, callSequence) {
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

  my.createTemplate = function(a) {
    // create a template which links a.documentId to a.one2editSession.fileId['workflow']
    // with the name, tags and description specified in the file upload form.
    my.callServer(a, {
      command: 'template.add',
      folderId: a.one2editSession.folderId['template'],
      name: a.template.name,
      tags: a.template.tags,
      description: a.template.description,
      documentId: a.documentId, // the master document
      workflowData: '<?xml version="1.0" encoding="utf-8"?><workflowData><workflow id="'+a.one2editSession.fileId['workflow']+'"></workflow></workflowData>'
    }, function(a) {
      // actually nothing to do
      passOn(a);
    });

  }


  return my;
}(L$ || { nameSpace: 'L$' }));
