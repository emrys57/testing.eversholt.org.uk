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
    } else { console.log('No more to do in sequence, finished.'); }
  }

  function maybeProgress(a, event, optionalExtras) {
    // if a handler is defined for the current event in the call sequence, execute it.
    // If it's not defined, look for a generic handler.
    if ((typeof a != 'undefined') && (typeof a.sequenceIndex != 'undefined') && (typeof a.callSequence != 'undefined ')&& (typeof a.callSequence[a.sequenceIndex] != 'undefined')) { // cope with sequenceIndex undefined, or off either end of array
      if (typeof (a.callSequence[a.sequenceIndex])[event]== 'function') {
        ((a.callSequence[a.sequenceIndex])[event])(a, event, optionalExtras);
      } else if ((typeof a.callSequence[a.sequenceIndex].f == 'function') && (typeof a.genericEvents != 'undefined') && (typeof a.genericEvents[event] == 'function')) {
        (a.genericEvents[event])(a, event, optionalExtras);
      }
    }
  }

  my.callServer = function(a, data, realSuccess, moreAjaxStuff) {
    // call the one2edit server.
    // the 'realSuccess' function is only called if the server does not return an error code.
    // 'data' is an array of the parameters to pass to the server.
    // callServer automatically adds the sessionId and workspaceId to data.
    // `a` is only used for logging and progress calls.
    // `moreAjaxStuff`, if present, is extra info to be added to the Ajax call.

    var myData = {
      sessionId: sessionId,
      clientId: clientId
    };
    $.extend(myData, data);
    // console.log('callServer: ', myData);
    ajaxCallObject = {
      url: apiUrl,
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
    if (typeof moreAjaxStuff == 'object') {
      $.extend(ajaxCallObject, moreAjaxStuff);
    }
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
    fd.append('sessionId', sessionId);
    fd.append('clientId', clientId);
    fd.append('command', 'asset.upload');
    fd.append('projectId', projectId);
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
      projectId: projectId, // that is the assset project
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
        projectId: projectId
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
      assetProjectId: projectId,
      assetIdentifier: assetIdentifier,
      folderId: uploadedMastersFolderId // where to create the new document
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

  function openFlash(a, ap) { // open the Flash editor
    console.log('openFlash: ap: ', ap);
    maybeProgress(a, 'adjustDisplayForFlash');
    var ap0 = {
      options: {
        onLogout: function() {
          maybeProgress(a, 'adjustDisplayAfterFlash');
          passOn(a);
        }
        // perhaps do something else after closing editor and sliding window up is finished
      },
      parameters: { wmode: 'opaque' },
      flashvars: {
        server: baseURL,
        sessionId: sessionId, // A sessionId is returned when we authenticate a user (see API example)
        clientId: clientId, // Id of our Client Workspace
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

  my.editJob = function(a) { // open the editor for teh tempalte job specified by jobId
    console.log('editJob: jobId: ', a.jobId);
    openFlash(a, {
      flashvars: {
        jobEditor: {
          jobId: a.jobId
        }
      }
    });
  }


  my.logoutFromServer = function(a) {
    my.callServer(a, {
      command: 'user.session.quit'
    });
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
    my.callServer(a, {
      command: a.type+'.folder.list',
      depth: 0 // recurse indefinitely
    }, function(a) {
      a.$folder = a.$xml.find('name:contains("'+a.folderName+'")').parent();
      passOn(a); // which we hope has the folder in it.
    });
  }

  function findFileInFolder(a) {
    // a.type is 'workflow', 'template' or 'document'
    a.folderId = a.$folder.children('id').text();
    my.callServer(a,{
      command: a.type+'.list',
      folderId: a.folderId
    }, function(a) {
      // TODO: this fails where a second folder includes the text and then more.
      a.$file = a.$xml.find('name:contains("'+a.fileName+'")').parent();
      passOn(a); // which we hope has the file in it.
    })
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


  return my;
}(L$ || { nameSpace: 'L$' }));
