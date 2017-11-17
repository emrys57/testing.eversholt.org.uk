var one2edit = {
  debug: false,
  debugFlags: 0,
  isDebug: function(flag) {
    if (!one2edit.debug) {
      return false;
    }
    if (typeof flag == "undefined") {
      return true;
    }
    for (var n in arguments) {
      if ((one2edit.debugFlags & arguments[n]) == 0) {
        return false;
      }
    }
    return true;
  },
  _debugFlagCount: 0,
  getDebugFlag: function() {
    return Math.pow(2, this._debugFlagCount++);
  },
  version: "$Revision$".replace(/^\$Revision:\s+(\d+)\s+\$$/, "$1")
};
one2edit.DEBUG_FLAG = one2edit.getDebugFlag();
if (!Array.prototype.indexOf) {
  Array.prototype.indexOf = function(value) {
    for (var i = 0, l = this.length; i < l; i++) {
      if (typeof value == "object" && typeof this[i] == "object") {
        if (value === this[i]) {
          return true;
        }
      } else {
        if (value == this[i]) {
          return true;
        }
      }
    }
    return false;
  };
}
if (typeof console == "undefined") {
  function Console() {}
  Console.prototype = {
    info: function(message) {},
    warn: function(message) {},
    error: function(message) {},
    log: function(message) {},
    dir: function(message) {},
    group: function() {},
    groupCollapsed: function() {},
    groupEnd: function() {},
    trace: function() {},
    time: function(timerName) {},
    timeEnd: function(timerName) {}
  };
  console = new Console();
}
one2edit.ready = (function(window) {
  var callbacks = [],
    DOMReadyCallback = function() {
      while (callbacks.length > 0) {
        var fn = callbacks.shift();
        fn();
      }
    },
    $ = function(callback) {
      readyBound = false;
      $.isReady = false;
      if (typeof callback === "function") {
        callbacks.push(callback);
      }
      bindReady();
    },
    document = window.document,
    readyBound = false,
    DOMContentLoaded = function() {
      if (document.addEventListener) {
        document.removeEventListener("DOMContentLoaded", DOMContentLoaded, false);
      } else {
        document.detachEvent("onreadystatechange", DOMContentLoaded);
      }
      DOMReady();
    },
    DOMReady = function() {
      if (!$.isReady) {
        if (!document.body) {
          setTimeout(DOMReady, 1);
          return;
        }
        $.isReady = true;
        DOMReadyCallback();
      }
    },
    bindReady = function() {
      var toplevel = false;
      if (readyBound) {
        return;
      }
      readyBound = true;
      if (document.readyState !== "loading") {
        DOMReady();
      }
      if (document.addEventListener) {
        document.addEventListener("DOMContentLoaded", DOMContentLoaded, false);
        window.addEventListener("load", DOMContentLoaded, false);
      } else {
        if (document.attachEvent) {
          document.attachEvent("onreadystatechange", DOMContentLoaded);
          window.attachEvent("onload", DOMContentLoaded);
          try {
            toplevel = window.frameElement == null;
          } catch (e) {}
          if (document.documentElement.doScroll && toplevel) {
            doScrollCheck();
          }
        }
      }
    },
    doScrollCheck = function() {
      if ($.isReady) {
        return;
      }
      try {
        document.documentElement.doScroll("left");
      } catch (error) {
        setTimeout(doScrollCheck, 1);
        return;
      }
      DOMReady();
    };
  $.isReady = false;
  return $;
})(window);
one2edit.isDefined = function one2edit_isDefined(values) {
  var result = true;
  for (var i = 0, l = arguments.length; i < l; i++) {
    if (arguments[i] === undefined) {
      result = false;
      break;
    }
  }
  return result;
};
one2edit.type = function one2edit_type(value) {
  var result = typeof value;
  if (result == "object" && value instanceof Array) {
    result = "array";
  }
  return result;
};
one2edit.isType = function one2edit_isType(value, type) {
  if (!(/^(string|boolean|number|object|array|function|undefined)$/i.test(type))) {
    if (one2edit.isDebug(one2edit.DEBUG_FLAG)) {
      console.warn("[one2edit/one2edit.isType] Invalid type `%s`".replace("%s", type));
    }
    return false;
  }
  return (one2edit.type(value) == type);
};
one2edit.utils = {};
one2edit.utils.ObjectUtil = {
  DEBUG_FLAG: one2edit.getDebugFlag(),
  resolve: function ObjectUtil_resolve(pathStr, object) {
    object = (object || one2edit);
    var tmp = object;
    var path = pathStr.split(/\./);
    var result = undefined;
    for (var i = 0, l = path.length; i < l; i++) {
      if (typeof tmp[path[i]] != "undefined") {
        tmp = tmp[path[i]];
        if (i == l - 1) {
          result = tmp;
          break;
        }
        continue;
      }
      if (i == 0 && i + 1 < path.length && typeof tmp[path[i + 1]] != "undefined") {
        continue;
      }
      break;
    }
    return result;
  },
  extend: function ObjectUtil_extend(obj, extenders) {
    for (var i = 1, l = arguments.length; i < l; i++) {
      for (var n in arguments[i]) {
        if (one2edit.isType(arguments[i][n], "object") && arguments[i][n] !== null) {
          obj[n] = this.extend({}, arguments[i][n]);
        } else {
          obj[n] = arguments[i][n];
        }
      }
    }
    return obj;
  },
  getterSetter: function ObjectUtil_getterSetter(variable, name, value) {
    switch (true) {
      case (one2edit.isType(name, "object")):
        return this.extend(variable, name);
      case (one2edit.isDefined(name, value)):
        return (variable[name] = value);
      case (one2edit.isDefined(name)):
        return variable[name];
      default:
        return variable;
    }
  },
  createQuery: (function() {
    var _internal = function(key, value, result) {
      result.push(key + "=" + encodeURI(value));
    };
    return function objectUtil_createQuery(queryObject) {
      var result = [];
      for (var n in queryObject) {
        if (one2edit.isType(queryObject[n], "array")) {
          for (var i = 0, l = queryObject[n].length; i < l; i++) {
            _internal(n, queryObject[n][i], result);
          }
        } else {
          _internal(n, queryObject[n], result);
        }
      }
      return result.join("&");
    };
  })(),
  createFromQuery: function ObjectUtil_createFromQuery(uri) {
    var result = {};
    if (!(/&|=/.test(uri))) {
      return result;
    }
    var search = uri.split(/\?/).pop();
    var pairs = search.split(/&|&amp;/ig);
    for (var i = 0, l = pairs.length; i < l; i++) {
      if (pairs[i].length == 0) {
        continue;
      }
      var split = pairs[i].split(/=/ig);
      result[split[0]] = one2edit.isDefined(split[1]) ? decodeURI(split[1]) : "";
    }
    return result;
  },
  flatten: (function() {
    function _internal(object, result, path, depth) {
      for (var n in object) {
        path.push(n);
        if (one2edit.isType(object[n], "object")) {
          _internal(object[n], result, path, depth + 1);
        } else {
          result[path.join(".")] = object[n];
        }
        path.pop();
      }
    }
    return function objectUtil_flatten(object) {
      var result = {};
      var path = [];
      _internal(object, result, path, 0);
      return result;
    };
  })(),
  count: function(obj) {
    var result = 0;
    for (var n in obj) {
      result++;
    }
    return result;
  },
  isObject: function(obj) {
    return obj !== null && ((obj instanceof Object) || typeof obj === "object");
  }
};
one2edit.utils.StringUtil = {
  DEBUG_FLAG: one2edit.getDebugFlag(),
  lcFirst: function(string) {
    return "".concat(string.substr(0, 1).toLowerCase(), string.substr(1));
  },
  ucFirst: function(string) {
    return "".concat(string.substr(0, 1).toUpperCase(), string.substr(1));
  },
  repeat: function(string, times) {
    var result = "";
    for (var i = 0; i < times; i++) {
      result += string;
    }
    return result;
  }
};
one2edit.utils.XMLUtil = {
  DEBUG_FLAG: one2edit.getDebugFlag(),
  parseXML: function(data) {
    var xml, tmp;
    if (window.DOMParser) {
      tmp = new DOMParser();
      xml = tmp.parseFromString(data, "text/xml");
    } else {
      xml = new ActiveXObject("Microsoft.XMLDOM");
      xml.async = "false";
      xml.loadXML(data);
    }
    tmp = xml.documentElement;
    if (!tmp || !tmp.nodeName || tmp.nodeName === "parsererror") {
      throw new Error("Invalid XML: " + data);
    }
    return xml;
  },
  asJSON: function(node, depth) {
    var result = {};
    var i, l;
    if (typeof depth == "undefined") {
      depth = 0;
    }
    if (node.nodeType == 1 && node.attributes.length > 0) {
      for (i = 0, l = node.attributes.length; i < l; i++) {
        var attr = node.attributes[i];
        result["@" + attr.nodeName] = attr.nodeValue;
      }
    } else {
      if (node.nodeType == 3) {
        result = node.nodeValue;
      }
    }
    if (node.hasChildNodes()) {
      for (i = 0, l = node.childNodes.length; i < l; i++) {
        var child = node.childNodes[i];
        var name = (node.localName || node.nodeName);
        var json = this.asJSON(child, depth + 1);
        if (typeof result[name] == "undefined") {
          result[name] = json;
        } else {
          for (var n in json) {
            if (typeof result[name][n] == "undefined") {
              result[name][n] = json[n];
              continue;
            } else {
              if (!(result[name][n] instanceof Array)) {
                result[name][n] = [result[name][n]];
              }
            }
            result[name][n].push(json[n]);
          }
        }
      }
    }
    return result;
  }
};
one2edit.events = {};
one2edit.events.Event = function(type, data) {
  this._type = type;
  this._data = data || {};
};
one2edit.events.Event.DEBUG_FLAG = one2edit.getDebugFlag();
one2edit.events.Event.INITIALIZE = "initialize";
one2edit.events.Event.CREATION_COMPLETE = "creationComplete";
one2edit.events.Event.PROPERTY_CHANGE = "propertyChange";
one2edit.events.Event.METHOD_EXECUTE = "methodExecute";
one2edit.events.Event.BEFORE_LOGOUT = "beforeLogout";
one2edit.events.Event.LOGOUT = "logout";
one2edit.events.Event.EDITOR_INITIALIZE = "editorInitialize";
one2edit.events.Event.EDITOR_COMPLETE = "editorComplete";
one2edit.events.Event.BEFORE_EDITOR_CLOSE = "beforeEditorClose";
one2edit.events.Event.EDITOR_CLOSE = "editorClose";
one2edit.events.Event.BEFORE_EDITOR_SAVE = "beforeEditorSave";
one2edit.events.Event.EDITOR_SAVE_DOCUMENT = "editorSaveDocument";
one2edit.events.Event.EDITOR_SAVE = "editorSave";
one2edit.events.Event.EDITOR_REFRESH = "editorRefresh";
one2edit.events.Event.ELEMENT_EDITOR_OPEN = "elementEditorOpen";
one2edit.events.Event.EDITOR_ERROR = "editorError";
one2edit.events.Event.UI_COMPONENT_EVENT = "uiComponentEvent";
one2edit.events.Event.ELEMENT_EVENT = "elementEvent";
one2edit.events.Event.RESULT_EVENT = "resultEvent";
one2edit.events.Event.BEFORE_SELECTION_CHANGE = "beforeSelectionChange";
one2edit.events.Event.SELECTION_CHANGE = "selectionChange";
one2edit.events.Event.SEGMENT_CONTENT_CHANGE = "segmentContentChange";
one2edit.events.Event.SPREAD_CHANGE = "spreadChange";
one2edit.events.Event.DYNAMIC_LAYOUT_ENGINE_LOADED_CHANGE = "dynamicLayoutEngineLoadedChange";
one2edit.events.Event.DYNAMIC_LAYOUT_ENGINE_ENABLED_CHANGE = "dynamicLayoutEngineEnabledChange";
one2edit.utils.ObjectUtil.extend(one2edit.events.Event.prototype, {
  _type: "one2edit.events.Event",
  type: function() {
    return this._type;
  },
  _data: {},
  data: function(name, value) {
    return one2edit.utils.ObjectUtil.getterSetter(this._data, name, value);
  },
  _target: null,
  target: function(value) {
    if (value) {
      this._target = value;
    }
    return this._target;
  },
  _isDefaultPrevented: false,
  preventDefault: function() {
    if (one2edit.isDebug(one2edit.events.Event.DEBUG_FLAG)) {
      console.log("[Event/preventDefault]");
    }
    this._isDefaultPrevented = true;
  },
  isDefaultPrevented: function() {
    return this._isDefaultPrevented;
  }
});
one2edit.events.ResumableEvent = function(type, data) {
  one2edit.events.Event.apply(this, arguments);
};
one2edit.events.ResumableEvent.BEFORE_EDITOR_CLOSE = "beforeEditorClose";
one2edit.events.ResumableEvent.BEFORE_EDITOR_SAVE = "beforeEditorSave";
one2edit.utils.ObjectUtil.extend(one2edit.events.ResumableEvent.prototype, one2edit.events.Event.prototype, {
  resume: function() {
    if (!this.isDefaultPrevented()) {
      throw new Error("Only canceled events can be resumed");
    }
    one2edit.call("editor.resumeEvent", {
      type: this.type()
    });
  }
});
one2edit.events.UIComponentEvent = function(type, data) {
  one2edit.events.Event.apply(this, arguments);
};
one2edit.events.UIComponentEvent.DEBUG_FLAG = one2edit.getDebugFlag();
one2edit.events.UIComponentEvent.MOUSE_CLICK = "mouseClick";
one2edit.events.UIComponentEvent.CHANGE = "change";
one2edit.utils.ObjectUtil.extend(one2edit.events.UIComponentEvent.prototype, one2edit.events.Event.prototype);
one2edit.events.ElementEvent = function(type, data) {
  one2edit.events.Event.apply(this, arguments);
};
one2edit.events.ElementEvent.DEBUG_FLAG = one2edit.getDebugFlag();
one2edit.events.ElementEvent.ELEMENT_QUERY_COMPLETE = "elementQueryComplete";
one2edit.events.ElementEvent.ELEMENT_COMPLETE = "elementComplete";
one2edit.events.ElementEvent.ELEMENT_CHANGE = "elementChange";
one2edit.utils.ObjectUtil.extend(one2edit.events.ElementEvent.prototype, one2edit.events.Event.prototype);
one2edit.events.StructureElementEvent = function(type, data) {
  this._type = type;
  this._data = data || {};
};
one2edit.events.StructureElementEvent.DEBUG_FLAG = one2edit.getDebugFlag();
one2edit.events.StructureElementEvent.CHANGE = "structureElementChange";
one2edit.utils.ObjectUtil.extend(one2edit.events.StructureElementEvent.prototype, one2edit.events.Event.prototype);
one2edit.events.ImageEditorEvent = function(type, data) {
  one2edit.events.Event.apply(this, arguments);
};
one2edit.events.ImageEditorEvent.DEBUG_FLAG = one2edit.getDebugFlag();
one2edit.events.ImageEditorEvent.REPLACE = "imageEditorReplace";
one2edit.events.ImageEditorEvent.START_FITTING = "imageEditorStartFitting";
one2edit.events.ImageEditorEvent.APPLY = "imageEditorApply";
one2edit.events.ImageEditorEvent.CANCEL = "imageEditorCancel";
one2edit.utils.ObjectUtil.extend(one2edit.events.ImageEditorEvent.prototype, one2edit.events.Event.prototype);
one2edit.events.ResultEvent = function(type, data) {
  one2edit.events.Event.apply(this, arguments);
};
one2edit.events.ResultEvent.handlers = {};
one2edit.events.ResultEvent.create = function(callback) {
  var result = new one2edit.events.ResultEvent(one2edit.events.Event.RESULT_EVENT);
  result._callback = callback;
  var uid = 1;
  while (one2edit.events.ResultEvent.handlers.hasOwnProperty(uid.toString())) {
    uid++;
  }
  result._uid = uid.toString();
  one2edit.events.ResultEvent.handlers[result._uid] = result;
  return result;
};
one2edit.events.ResultEvent.handle = function(data) {
  var event = one2edit.events.ResultEvent.handlers[data.uid];
  if (event) {
    delete one2edit.events.ResultEvent.handlers[event._uid];
    event._data = data;
    if (event._callback instanceof Function) {
      event._callback(event);
    }
  }
};
one2edit.utils.ObjectUtil.extend(one2edit.events.ResultEvent.prototype, one2edit.events.Event.prototype, {
  _callback: null,
  _uid: null,
  uid: function() {
    return this._uid;
  },
  result: function() {
    return this.data("result");
  },
  success: function() {
    return this.data("success");
  }
});
one2edit.events.EventDispatcher = function() {
  this._eventListener = {};
};
one2edit.events.EventDispatcher.DEBUG_FLAG = one2edit.getDebugFlag();
one2edit.events.EventDispatcher.createCallback = function(object, eventType, callback) {
  if (one2edit.isType(object.addEventListener, "function") && one2edit.isType(object.removeEventListener, "function")) {
    object.addEventListener(eventType, function(event) {
      object.removeEventListener(eventType, arguments.callee);
      callback(event);
    }, false);
  } else {
    throw new Error("`object` seems not be an event dispatcher!");
  }
};
one2edit.utils.ObjectUtil.extend(one2edit.events.EventDispatcher.prototype, {
  _eventListener: null,
  _eventCallbackTarget: function EventDispatcher__eventCallbackTarget() {
    return this;
  },
  _invokeEventCallback: function EventDispatcher__invokeEventCallback(event) {
    var eventName = "on" + one2edit.utils.StringUtil.ucFirst(event.type());
    var target = this._eventCallbackTarget();
    if (one2edit.isDebug(one2edit.events.EventDispatcher.DEBUG_FLAG)) {
      try {
        console.log("[EventDispatcher/_invokeEventCallback]", "\n\tevent:", event, "\n\teventCallback:", eventName, "\n\teventCallbackTarget:", target, "\n\teventCallbackFunction", target[
          eventName]);
      } catch (e) {
        console.log("[EventDispatcher/_invokeEventCallback] Can't output event infos.");
      }
    }
    if (target[eventName] && typeof target[eventName] == "function") {
      return target[eventName].call(this, event);
    } else {
      return null;
    }
  },
  dispatchEvent: function EventDispatcher_dispatchEvent(event, data) {
    if (typeof event == "undefined" || event === null) {
      if (one2edit.isDebug(one2edit.events.EventDispatcher.DEBUG_FLAG)) {
        console.warn("[EventDispatcher/dispatchEvent] No event given! Aborting.");
      }
      return false;
    }
    if (one2edit.isType(event, "string")) {
      event = new one2edit.events.Event(event, data);
    }
    if (!this._eventListener) {
      this._eventListener = {};
    }
    event.target(this);
    if (this._eventListener.hasOwnProperty(event.type()) && this._eventListener[event.type()].length > 0) {
      var listener = this._eventListener[event.type()];
      var listenerCopy = listener.slice();
      for (var i = 0, l = listenerCopy.length; i < l; i++) {
        var callback = listenerCopy[i];
        if (listener.indexOf(callback) >= 0) {
          callback.call(this, event);
        }
      }
    }
    this._invokeEventCallback(event);
    var result = !event.isDefaultPrevented();
    if (one2edit.isDebug(one2edit.events.EventDispatcher.DEBUG_FLAG)) {
      try {
        console.log("[EventDispatcher/dispatchEvent]", "\n\tevent:", event, "\n\tdata:", data, "\n\ttarget:", this, "\n\tresult:", result, "\n\tdefaultPrevented:", event.isDefaultPrevented());
      } catch (e) {
        console.log("[EventDispatcher/dispatchEvent] Can't output event infos.");
      }
    }
    return result;
  },
  addEventListener: function EventDispatcher_addEventListener(eventType, listener) {
    if (!one2edit.isDefined(this._eventListener)) {
      this._eventListener = {};
    }
    if (!one2edit.isDefined(this._eventListener[eventType])) {
      this._eventListener[eventType] = [];
    }
    this._eventListener[eventType].push(listener);
  },
  removeEventListener: function EventDispatcher_removeEventListener(eventType, listener) {
    if (!one2edit.isDefined(this._eventListener[eventType])) {
      return;
    }
    for (var i = 0, l = this._eventListener[eventType].length; i < l; i++) {
      if (this._eventListener[eventType][i] === listener) {
        this._eventListener[eventType].splice(i, 1);
        return;
      }
    }
  },
  hasEventListener: function EventDispatcher_hasEventListener(eventType, listener) {
    if (!one2edit.isDefined(this._eventListener[eventType])) {
      return false;
    }
    if (one2edit.isType(listener, "function")) {
      for (var i = 0, l = this._eventListener[eventType].length; i < l; i++) {
        if (this._eventListener[eventType][i] === listener) {
          return true;
        }
      }
    } else {
      if (one2edit.isType(this._eventListener[eventType], "array") && this._eventListener[eventType].length > 0) {
        return true;
      }
    }
    return false;
  },
  bind: function EventDispatcher_bind(fn, bind) {
    bind = bind || this;
    return function() {
      return fn.apply(bind, arguments);
    };
  }
});
one2edit.data = {};
one2edit.data.Properties = function(properties) {
  var p = one2edit.utils.ObjectUtil.extend({}, this._defaultProperties || {}, properties || {});
  this.properties(p);
};
one2edit.data.Properties.DEBUG_FLAG = one2edit.getDebugFlag();
one2edit.utils.ObjectUtil.extend(one2edit.data.Properties.prototype, {
  _properties: null,
  _defaultProperties: null,
  properties: function(name, value) {
    if (!this._properties) {
      this._properties = {};
    }
    return one2edit.utils.ObjectUtil.getterSetter(this._properties, name, value);
  }
});
one2edit.data.WorkflowStatus = function(properties) {
  one2edit.data.Properties.call(this, properties);
  one2edit.events.EventDispatcher.call(this);
};
one2edit.utils.ObjectUtil.extend(one2edit.data.WorkflowStatus.prototype, one2edit.data.Properties.prototype, one2edit.events.EventDispatcher.prototype, {
  _className: "one2edit.data.WorkflowStatus",
  label: function() {
    return this.properties("label");
  },
  step: function() {
    return this.properties("step");
  },
  status: function() {
    return this.properties("status");
  },
  toString: function() {
    return "[one2edit.data.WorkflowStatus step: " + this.step().toString() + " status: " + this.status() + "]";
  }
});
one2edit.net = {};
one2edit.net.Loader = (function() {
  var _loadedFiles = {};
  var _loadCallback = function Loader__loadCallback(element, callback) {
    var filename = "";
    switch (element.tagName.toLowerCase()) {
      case "script":
        filename = element.src;
        break;
      case "link":
        filename = element.href;
        break;
    }
    if (filename in _loadedFiles) {
      _loadedFiles[filename] = true;
      if (typeof callback == "function") {
        callback(element);
      }
    }
  };
  return {
    load: function Loader_load(filename, callback) {
      var element = null;
      var extension = filename.match(/\.(\w+)$/).pop();
      switch (extension) {
        case "js":
          element = document.createElement("script");
          element.src = filename;
          element.type = "text/javascript";
          _loadedFiles[element.src] = false;
          break;
        case "css":
          element = document.createElement("link");
          element.href = filename;
          element.rel = "stylesheet";
          _loadedFiles[element.href] = false;
          break;
      }
      if (typeof element.onreadystatechange != "undefined") {
        element.onreadystatechange = function() {
          if (element.readyState == "complete" || element.readyState == "loaded") {
            _loadCallback(this, callback);
          }
        };
      } else {
        element.onload = function() {
          if (one2edit.isDebug(one2edit.net.Loader.DEBUG_FLAG)) {
            console.log("[Loader/onload]\n\t", this.href || this.src);
          }
          _loadCallback(this, callback);
        };
        element.onerror = function() {
          if (one2edit.isDebug(one2edit.net.Loader.DEBUG_FLAG)) {
            console.log("[Loader/onerror]\n\t", this.href || this.src);
          }
          _loadCallback(this, callback);
        };
      }
      var head = (typeof document.head != "undefined") ? document.head : document.getElementsByTagName("head")[0];
      head.appendChild(element);
    }
  };
})();
one2edit.net.Loader.DEBUG_FLAG = one2edit.getDebugFlag();
one2edit.net.XMLHttpRequest = function(properties) {
  one2edit.data.Properties.call(this, properties);
  one2edit.events.EventDispatcher.call(this);
  this._xhr = this._attempt(function() {
    return new XMLHttpRequest();
  }, function() {
    return ActiveXObject("Msxml2.XMLHTTP");
  }, function() {
    return new ActiveXObject("Microsoft.XMLHTTP");
  });
  if (one2edit.isType(this._xhr.addEventListener, "function")) {
    this._xhr.addEventListener("readystatechange", this.bind(this._onReadyStateChange, this), false);
    this._xhr.addEventListener("error", this.bind(this._errorHandler), false);
    this._xhr.addEventListener("abort", this.bind(this._abortHandler), false);
    if (one2edit.isDefined(this._xhr.timeout)) {
      this._xhr.addEventListener("timeout", this.bind(this._timeoutHandler), false);
    }
  } else {
    this._xhr.onreadystatechange = this.bind(this._onReadyStateChange);
  }
};
one2edit.utils.ObjectUtil.extend(one2edit.net.XMLHttpRequest, {
  DEBUG_FLAG: one2edit.getDebugFlag(),
  READY_STATE_UNSENT: 0,
  READY_STATE_OPENED: 1,
  READY_STATE_HEADERS_RECEIVED: 2,
  READY_STATE_LOADING: 3,
  READY_STATE_DONE: 4,
  FORMAT_JSON: "json",
  FORMAT_XML: "xml",
  FORMAT_PLAIN: "plain",
  METHOD_GET: "GET",
  METHOD_POST: "POST"
});
one2edit.utils.ObjectUtil.extend(one2edit.net.XMLHttpRequest.prototype, one2edit.data.Properties.prototype, one2edit.events.EventDispatcher.prototype, {
  _className: "one2edit.net.XMLHttpRequest",
  _xhr: null,
  request: function() {
    return this._xhr;
  },
  _readyState: one2edit.net.XMLHttpRequest.READY_STATE_UNSENT,
  readyState: function() {
    return this._readyState;
  },
  isInteracting: function() {
    return (this._readyState > one2edit.net.XMLHttpRequest.READY_STATE_UNSENT && this._readyState < one2edit.net.XMLHttpRequest.READY_STATE_DONE);
  },
  _defaultProperties: {
    async: true,
    url: null,
    method: "GET",
    params: null,
    headers: {},
    requestContentType: "application/x-www-form-urlencoded",
    responseContentType: null,
    data: null,
    timeout: -1,
    format: "xml"
  },
  _eventCallbackTarget: function() {
    return this._properties;
  },
  _attempt: function() {
    var result = null;
    for (var i = 0; i < arguments.length; i++) {
      try {
        if ((result = arguments[i]())) {
          break;
        }
      } catch (e) {
        if (one2edit.isDebug(one2edit.net.XMLHttpRequest.DEBUG_FLAG)) {
          console.error("[one2edit.net.XMLHttpRequest/_attempt] error:", e);
        }
      }
    }
    return result;
  },
  headers: function(name, value) {
    return one2edit.utils.ObjectUtil.getterSetter(this._properties.headers, name, value);
  },
  params: function(name, value) {
    if (one2edit.isType(name, "object") && !one2edit.isDefined(value)) {
      return (this._properties.params = name);
    }
    return one2edit.utils.ObjectUtil.getterSetter(this._properties.params, name, value);
  },
  open: function(method, url) {
    method = this.properties("method", method);
    url = this.properties("url", url);
    var params = this.properties("params");
    var async = this.properties("async");
    var query = "";
    if (this.properties("method") == one2edit.net.XMLHttpRequest.METHOD_GET) {
      query = one2edit.utils.ObjectUtil.createQuery(this.properties("params"));
      if (query.length) {
        url += (!(/\?$/.test(url)) ? "?" : "") + query;
      }
    }
    if (one2edit.isDebug(one2edit.net.XMLHttpRequest.DEBUG_FLAG)) {
      console.log("[one2edit.net.XMLHttpRequest/open]", "\n\tmethod:", method, "\n\turl:", url, "\n\tasync:", async);
    }
    this._xhr.open(method, url, async);
  },
  send: function(params) {
    var isPost = (this.properties("method") == one2edit.net.XMLHttpRequest.METHOD_POST);
    if (isPost) {
      if (params) {
        this.params(one2edit.utils.ObjectUtil.createFromQuery(params));
      } else {
        params = one2edit.utils.ObjectUtil.createQuery(this.properties("params")) || null;
      }
    } else {
      params = null;
    }
    if (this.dispatchEvent("send")) {
      var headers = this.properties("headers");
      var timeout = this.properties("timeout");
      for (var name in headers) {
        this._xhr.setRequestHeader(name, headers[name]);
      }
      if (isPost) {
        this._xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
      }
      if (one2edit.isDebug(one2edit.net.XMLHttpRequest.DEBUG_FLAG)) {
        console.log("[one2edit.net.XMLHttpRequest/send] params:", params);
      }
      if (timeout > 0) {
        if (one2edit.isDefined(this._xhr.timeout)) {
          this._xhr.timeout = timeout;
        } else {
          setTimeout(this.bind(function() {
            if (this._readyState < one2edit.net.XMLHttpRequest.READY_STATE_DONE) {
              this.abort();
              this._timeoutHandler(new one2edit.events.Event("timeout"));
            }
          }), timeout);
        }
      }
      this._xhr.send(params);
    }
  },
  abort: function() {
    this._xhr.abort();
  },
  getAllResponseHeaders: function() {
    return this._xhr.getAllResponseHeaders();
  },
  getResponseHeader: function(header) {
    return this._xhr.getResponseHeader(header);
  },
  overrideMimeType: function(mime) {
    return this._xhr.overrideMimeType(mime);
  },
  _onReadyStateChange: function() {
    if (this._xhr.readyState != this._readyState) {
      this.dispatchEvent("readyStateChange", {
        oldValue: this._readyState,
        newValue: this._xhr.readyState
      });
      if (one2edit.isDebug(one2edit.net.XMLHttpRequest.DEBUG_FLAG)) {
        console.log("[XMLHttpRequest/_onReadyStateChange]", "\n\toldState:", this._readyState, "\n\tnewState:", this._xhr.readyState);
      }
      this._readyState = this._xhr.readyState;
    }
    switch (this._xhr.readyState) {
      case one2edit.net.XMLHttpRequest.READY_STATE_UNSENT:
        break;
      case one2edit.net.XMLHttpRequest.READY_STATE_OPENED:
        break;
      case one2edit.net.XMLHttpRequest.READY_STATE_HEADERS_RECEIVED:
        break;
      case one2edit.net.XMLHttpRequest.READY_STATE_LOADING:
        break;
      case one2edit.net.XMLHttpRequest.READY_STATE_DONE:
        this._doneHandler();
        break;
    }
  },
  _doneHandler: function() {
    var result = null;
    if (this._xhr.status == 200) {
      switch (this.properties("format")) {
        case "plain":
          result = this._xhr.responseText;
          break;
        case "json":
          result = eval("(" + this._xhr.responseText + ")");
          break;
        case "xml":
          if (one2edit.isDefined(this._xhr.responseXML)) {
            result = this._xhr.responseXML;
          } else {
            if (one2edit.isDefined(this._xhr.responseText)) {
              result = one2edit.utils.XMLUtil.parseXML(this._xhr.responseText || null);
            }
          }
          break;
      }
    }
    if (one2edit.isDebug(one2edit.net.XMLHttpRequest.DEBUG_FLAG)) {
      console.log("[one2edit.net.XMLHttpRequest/_doneHandler] result:", String(result));
    }
    this.dispatchEvent("done", {
      result: result
    });
  },
  _errorHandler: function(event) {
    if (one2edit.isDebug(one2edit.net.XMLHttpRequest.DEBUG_FLAG)) {
      console.log("[one2edit.net.XMLHttpRequest/_errorHandler] event:", event);
    }
    this.dispatchEvent("error", event);
  },
  _abortHandler: function(event) {
    if (one2edit.isDebug(one2edit.net.XMLHttpRequest.DEBUG_FLAG)) {
      console.log("[one2edit.net.XMLHttpRequest/_abortHandler] event:", event);
    }
    this.dispatchEvent("abort", event);
  },
  _timeoutHandler: function(event) {
    if (one2edit.isDebug(one2edit.net.XMLHttpRequest.DEBUG_FLAG)) {
      console.log("[one2edit.net.XMLHttpRequest/_timeOutHandler] event:", event);
    }
    this.dispatchEvent("timeout", event);
  }
});
one2edit.net.ServerApi = function(properties) {
  one2edit.data.Properties.call(this, properties || {});
  one2edit.events.EventDispatcher.call(this);
  var url = this.properties("url");
  if (!url) {
    url = (one2edit.options("server") || one2edit.flashvars("server"));
  }
  url = this._completeUrl(url);
  this.properties("url", url);
  this._xhr = new one2edit.net.XMLHttpRequest({
    url: url,
    method: "GET",
    onError: this.bind(this._xhr_onError)
  });
};
one2edit.net.ServerApi.DEBUG_FLAG = one2edit.getDebugFlag();
one2edit.utils.ObjectUtil.extend(one2edit.net.ServerApi.prototype, one2edit.data.Properties.prototype, one2edit.events.EventDispatcher.prototype, {
  _className: "one2edit.net.ServerApi",
  _defaultProperties: {
    url: null,
    clientId: null,
    sessionId: null,
    authUsername: null,
    authPassword: null,
    authDomain: null,
    pingInterval: 10000
  },
  _xhr: null,
  _result: null,
  result: function() {
    return this._result;
  },
  _command: null,
  command: function() {
    return this._command;
  },
  _arguments: null,
  arguments: function() {
    return this._arguments;
  },
  _authFields: ["sessionId", "authUsername", "authPassword", "authDomain", "clientId"],
  _xhr_onError: function(event) {
    if (one2edit.isDebug(one2edit.net.ServerApi.DEBUG_FLAG)) {
      console.error("[one2edit.net.XMLHttpRequest/_xhr_onError] event:", event);
    }
    this.dispatchEvent("error", event);
  },
  _eventCallbackTarget: function() {
    return this._properties;
  },
  properties: function(name, value) {
    if (arguments.length == 2 && this._xhr) {
      switch (name) {
        case "url":
          value = this._completeUrl(value);
          this._xhr.properties("params")[name] = value;
          break;
        case "clientId":
        case "sessionId":
          this._xhr.properties("params")[name] = value;
          if (this._pingXhr) {
            this._pingXhr.properties("params")[name] = value;
          }
          break;
      }
    }
    return one2edit.data.Properties.prototype.properties.apply(this, arguments);
  },
  _completeUrl: function(url) {
    if (url && !(/Api\.php$/).test(url)) {
      if (!(/\/$/).test(url)) {
        url += "/";
      }
      url += "Api.php";
    }
    return url;
  },
  _createAuthCredentials: function() {
    var result = {};
    var ignore = /auth(Username|Password|Domain)/;
    for (var i = 0, l = this._authFields.length; i < l; i++) {
      var field = this._authFields[i];
      if (this.properties("sessionId") && ignore.test(field)) {
        continue;
      }
      if (this.properties(field)) {
        result[field] = this.properties(field);
      }
    }
    return result;
  },
  authCredentials: function() {
    var i, field;
    if (arguments.length > 0) {
      for (i = 0, field = null; i < this._authFields.length && i < arguments.length && (field = this._authFields[i]); i++) {
        this.properties(field, arguments[i]);
      }
    } else {
      var result = {};
      for (i = 0, field = null; i < this._authFields.length && i < arguments.length && (field = this._authFields[i]); i++) {
        result[field] = this.properties(field);
      }
    }
  },
  request: function(cmd, args, callback) {
    var params = this._createAuthCredentials();
    params.command = cmd;
    for (var n in args) {
      if (/command/.test(n)) {
        continue;
      }
      params[n] = args[n];
    }
    this._command = cmd;
    this._arguments = args;
    this._xhr.properties("params", params);
    var fn = this.bind(function(event) {
      this._xhr.removeEventListener("done", fn);
      var callbackArgument = null;
      try {
        var result = event.data("result");
        if (!result) {
          throw new Error(event);
        }
        if (result.firstChild.localName == "error") {
          throw new Error(result.firstChild.childNodes[1].textContent);
        }
        callbackArgument = this._result = new one2edit.net.ServerApiResult(result);
      } catch (e) {
        if (one2edit.isDebug(one2edit.net.ServerApi.DEBUG_FLAG)) {
          console.error("[one2edit.net.ServerApi/request] error:", e);
        }
        callbackArgument = e;
      } finally {
        if (one2edit.isType(callback, "function")) {
          callback(callbackArgument);
        }
      }
      this.dispatchEvent("complete", {
        result: this._result
      });
    });
    this._xhr.addEventListener("done", fn);
    this._xhr.open();
    this._xhr.send();
  },
  createDocumentPreviewLink: function(id) {
    var params = one2edit.utils.ObjectUtil.extend(this._createAuthCredentials(), {
      id: id,
      command: "document.preview"
    });
    return this._completeUrl(this.properties("url")).concat("?", one2edit.utils.ObjectUtil.createQuery(params));
  },
  _pingXhr: null,
  _pingIntervalId: null,
  _onPingInterval: function() {
    try {
      this._pingXhr.open();
      this._pingXhr.send();
    } catch (e) {
      if (one2edit.isDebug(one2edit.net.ServerApi.DEBUG_FLAG)) {
        console.warn("[one2edit.net.ServerApi#_onPingInterval] Ping failed:", e);
      }
      this.ping(false);
    }
  },
  ping: function(flag) {
    if (!this.properties("sessionId")) {
      if (one2edit.isDebug(one2edit.net.ServerApi.DEBUG_FLAG)) {
        console.warn("[one2edit.net.ServerApi#ping] properties.sessionId not set!");
      }
      return;
    }
    if (!this._pingXhr) {
      this._pingXhr = new one2edit.net.XMLHttpRequest({
        url: this._xhr.properties("url"),
        params: {
          command: "user.session.ping",
          sessionId: this.properties("sessionId"),
          clientId: this.properties("clientId")
        }
      });
    }
    if (flag && this._pingIntervalId == null) {
      this._pingIntervalId = setInterval(this.bind(this._onPingInterval), this.properties("pingInterval"));
    }
    if (!flag && this._pingIntervalId > 0) {
      clearInterval(this._pingIntervalId);
      this._pingIntervalId = null;
    }
  }
});
one2edit.net.ServerApiResult = function(source) {
  if (one2edit.isType(source, "string")) {
    source = one2edit.utils.XMLUtil.parseXML(source);
  }
  this._source = source;
};
one2edit.net.ServerApiResult.DEBUG_FLAG = one2edit.getDebugFlag();
one2edit.utils.ObjectUtil.extend(one2edit.net.ServerApiResult.prototype, {
  _source: null,
  source: function() {
    return this._source;
  },
  xpath: function(queryString) {
    var result = [];
    var xpath = null;
    var tmp = null;
    if (this._source.evaluate && one2edit.isType(this._source.evaluate, "function")) {
      xpath = this._source.evaluate(queryString, this._source, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
      while ((tmp = xpath.iterateNext())) {
        result.push(tmp);
      }
    } else {
      if (typeof this._source.selectNodes != "undefined") {
        xpath = this._source.selectNodes(queryString);
        for (var i = 0, l = xpath.length; i < l; i++) {
          result.push(xpath.item(i));
        }
      } else {
        throw new Error("Your browser does not support xpath!");
      }
    }
    return result;
  },
  asXML: function() {
    return this._source;
  },
  asJSON: function(node) {
    if (typeof node == "undefined") {
      for (var i = 0, l = this._source.childNodes.length; i < l; i++) {
        if (this._source.childNodes[i].nodeType == 1) {
          node = this._source.childNodes[i];
          break;
        }
      }
    }
    var result = one2edit.utils.XMLUtil.asJSON(node);
    if (one2edit.isDebug(one2edit.net.ServerApi.DEBUG_FLAG)) {
      console.log("[one2edit.net.ServerApiResult/asJSON] result:", result);
    }
    if (!result.success) {
      throw new Error("No results found!");
    }
    return result.success;
  }
});
one2edit.ui = {};
one2edit.ui.UIComponent = function(properties) {
  one2edit.data.Properties.call(this, properties);
  one2edit.events.EventDispatcher.call(this);
  this._instance();
};
one2edit.ui.UIComponent.DEBUG_FLAG = one2edit.getDebugFlag();
one2edit.ui.UIComponent.getInstancesByClass = function(Class) {
  if (!one2edit.isDefined(Class._instances)) {
    Class._instances = {};
  }
  return Class._instances;
};
one2edit.utils.ObjectUtil.extend(one2edit.ui.UIComponent.prototype, one2edit.data.Properties.prototype, one2edit.events.EventDispatcher.prototype, {
  _className: "one2edit.ui.UIComponent",
  _eventCallbackTarget: function() {
    return this._properties;
  },
  _instance: function() {
    if (!this._properties) {
      throw new Error("properties are undefined!");
    }
    if (!this._properties.hasOwnProperty("id") || !String(this._properties.id).length) {
      throw new Error("required property id not found!");
    }
    var Class = one2edit.utils.ObjectUtil.resolve(this._className, one2edit);
    this._properties.className = this._className;
    one2edit.ui.UIComponent.getInstancesByClass(Class)[this._properties.id] = this;
    if (one2edit.isDebug(one2edit.ui.UIComponent.DEBUG_FLAG)) {
      console.log("[one2edit.ui.UIComponent/_instance]", "Class:", Class);
    }
  },
  id: function(value) {
    return this.properties("id", value);
  }
});
one2edit.ui.ElementGroup = function(properties) {
  one2edit.ui.UIComponent.call(this, properties);
  this._elements = {};
};
one2edit.ui.ElementGroup.DEBUG_FLAG = one2edit.getDebugFlag();
one2edit.utils.ObjectUtil.extend(one2edit.ui.ElementGroup.prototype, one2edit.ui.UIComponent.prototype, {
  _className: "one2edit.ui.ElementGroup",
  _elements: null,
  _call: function(cmd, args) {
    return one2edit.call(this.properties("path").concat(".", cmd), args);
  },
  _getOrCreateElement: function(data) {
    if (!data) {
      return null;
    }
    if (this._elements.hasOwnProperty(data.id)) {
      return this._elements[data.id];
    }
    try {
      var cl = one2edit.utils.ObjectUtil.resolve(data.className);
      var ui = new cl(data);
      this._elements[ui.id()] = ui;
      return ui;
    } catch (e) {
      throw new Error("Unknown ui element type `%s`!".replace("%s", data.className));
    }
  },
  visible: function(value) {
    return this._call("visible", value);
  },
  getElement: function(identifier, by) {
    if (by === undefined) {
      by = "id";
    }
    switch (by) {
      case "id":
        return this.getElementById(identifier);
        break;
      case "index":
        return this.getElementByIndex(identifier);
        break;
      default:
        throw new Error("Unkown value for argument `by`!");
        break;
    }
  },
  getElementByIndex: function(index) {
    var result = this._call("getElementByIndex", {
      index: index
    });
    return this._getOrCreateElement(result);
  },
  getElementById: function(id) {
    var result = this._call("getElementById", {
      id: id
    });
    return this._getOrCreateElement(result);
  },
  getElementIndex: function(value) {
    var id = (value._className && (/^one2edit\.ui\.\w+/).test(value._className)) ? value.id() : value;
    return this._call("getElementIndex", {
      id: id
    });
  },
  addElement: function(uiComponent) {
    this._elements[uiComponent.id()] = uiComponent;
    return this._call("addElement", uiComponent.properties());
  },
  addElementAt: function(uiComponent, index) {
    this._elements[uiComponent.id()] = uiComponent;
    return this._call("addElementAt", one2edit.utils.ObjectUtil.extend(uiComponent.properties(), {
      index: index
    }));
  },
  removeElement: function(value) {
    var id = (value._className && (/^one2edit\.ui\.\w+/).test(value._className)) ? value.id() : value;
    return this._call("removeElement", {
      id: id
    });
  },
  removeElementAt: function(index) {
    return this._call("removeElementAt", {
      index: index
    });
  }
});
one2edit.ui.Button = function(properties) {
  one2edit.ui.UIComponent.apply(this, arguments);
};
one2edit.ui.Button.DEBUG_FLAG = one2edit.getDebugFlag();
one2edit.utils.ObjectUtil.extend(one2edit.ui.Button.prototype, one2edit.ui.UIComponent.prototype, {
  _className: "one2edit.ui.Button",
  label: function(value) {
    return this.properties("label", value);
  },
  icon: function(value) {
    return this.properties("icon", value);
  }
});
one2edit.ui.ToggleButton = function(properties) {
  one2edit.ui.Button.apply(this, arguments);
  this.addEventListener(one2edit.events.UIComponentEvent.MOUSE_CLICK, this.bind(this._onMouseClick));
};
one2edit.ui.ToggleButton.DEBUG_FLAG = one2edit.getDebugFlag();
one2edit.utils.ObjectUtil.extend(one2edit.ui.ToggleButton.prototype, one2edit.ui.Button.prototype, {
  _className: "one2edit.ui.ToggleButton",
  _defaultProperties: {
    selected: false
  },
  _onMouseClick: function(event) {
    this.selected(event.data("selected"));
  },
  selected: function(value) {
    return this.properties("selected", value);
  }
});
one2edit.ui.ToolbarSeperator = function(properties) {
  if (!this.properties("id")) {
    var count = one2edit.utils.ObjectUtil.count(one2edit.ui.UIComponent.getInstancesByClass(one2edit.ui.ToolbarSeperator));
    this.properties("id", "toolbarSeperator" + count);
  }
  one2edit.ui.UIComponent.apply(this, arguments);
};
one2edit.utils.ObjectUtil.extend(one2edit.ui.ToolbarSeperator.prototype, one2edit.ui.UIComponent.prototype, {
  _className: "one2edit.ui.ToolbarSeperator"
});
one2edit.ui.DropDown = function(properties) {
  one2edit.ui.UIComponent.apply(this, arguments);
};
one2edit.ui.DropDown.DEBUG_FLAG = one2edit.getDebugFlag();
one2edit.utils.ObjectUtil.extend(one2edit.ui.DropDown.prototype, one2edit.ui.UIComponent.prototype, {
  _className: "one2edit.ui.DropDown"
});
one2edit.ui.EditorPanel = function(properties) {
  one2edit.ui.UIComponent.apply(this, arguments);
};
one2edit.ui.EditorPanel.DEBUG_FLAG = one2edit.getDebugFlag();
one2edit.utils.ObjectUtil.extend(one2edit.ui.EditorPanel.prototype, one2edit.ui.UIComponent.prototype, {
  _className: "one2edit.ui.EditorPanel"
});
one2edit.elements = {
  SEGMENT_ELEMENT: "one2edit.elements.SegmentElement",
  IMAGE_ELEMENT: "one2edit.elements.ImageElement",
  ELEMENT: "one2edit.elements.Element",
  ANY_ELEMENT: "one2edit.elements.AnyElement",
  FRAME_ELEMENT: "one2edit.elements.FrameElement",
  GROUP_ELEMENT: "one2edit.elements.GroupElement",
  LAYER_ELEMENT: "one2edit.elements.LayerElement",
  LABEL_ELEMENT: "one2edit.elements.LabelElement",
  TABLE_ELEMENT: "one2edit.elements.TableElement",
  SPREAD_ELEMENT: "one2edit.elements.SpreadElement",
  TABLE_CELL_ELEMENT: "one2edit.elements.TableCellElement",
  SPREAD_LAYER_ELEMENT: "one2edit.elements.SpreadLayerElement",
  getClassByIdentifier: function(value) {
    switch (value) {
      case one2edit.elements.ELEMENT:
        return one2edit.elements.Element;
      case one2edit.elements.TABLE_CELL_ELEMENT:
        return one2edit.elements.HierarchyElement;
      case one2edit.elements.SPREAD_LAYER_ELEMENT:
        return one2edit.elements.SpreadLayerElement;
      case one2edit.elements.SEGMENT_ELEMENT:
        return one2edit.elements.SegmentElement;
      case one2edit.elements.IMAGE_ELEMENT:
        return one2edit.elements.ImageElement;
      case one2edit.elements.FRAME_ELEMENT:
        return one2edit.elements.FrameElement;
      case one2edit.elements.GROUP_ELEMENT:
        return one2edit.elements.GroupElement;
      case one2edit.elements.LAYER_ELEMENT:
        return one2edit.elements.LayerElement;
      case one2edit.elements.SPREAD_ELEMENT:
        return one2edit.elements.SpreadElement;
      case one2edit.elements.LABEL_ELEMENT:
        return one2edit.elements.LabelElement;
      case one2edit.elements.TABLE_ELEMENT:
        return one2edit.elements.TableElement;
      default:
        throw new Error("Unknown element identifier!");
        return null;
    }
  }
};
one2edit.elements.ElementQuery = function() {
  if (typeof arguments[0].id == "undefined") {
    arguments[0].id = one2edit.elements.ElementQuery.nextId++;
  }
  one2edit.ui.UIComponent.apply(this, arguments);
  this.addEventListener(one2edit.events.ElementEvent.ELEMENT_QUERY_COMPLETE, this._onElementQueryComplete);
};
one2edit.elements.ElementQuery.DEBUG_FLAG = one2edit.getDebugFlag();
one2edit.elements.ElementQuery.nextId = 1;
one2edit.utils.ObjectUtil.extend(one2edit.elements.ElementQuery.prototype, one2edit.ui.UIComponent.prototype, {
  _className: "one2edit.elements.ElementQuery",
  _complete: false,
  complete: function() {
    return this._complete;
  },
  _result: null,
  result: function(index) {
    if (one2edit.isType(index, "number") && one2edit.isType(this._result, "array")) {
      var idx = (index > 0) ? this._result.length - (index % this._result.length) : index % this._result.length;
      return this._result[idx];
    }
    return this._result;
  },
  id: function() {
    return this.properties("id");
  },
  _getElement: function(data) {
    var elementClass = one2edit.elements.getClassByIdentifier(data.type);
    return (one2edit.ui.UIComponent.getInstancesByClass(elementClass).hasOwnProperty(data.id)) ? one2edit.ui.UIComponent.getInstancesByClass(elementClass)[data.id] : null;
  },
  _createElement: function(data) {
    var Class = one2edit.elements.getClassByIdentifier(data.type);
    var result = new Class(data);
    if (one2edit.isDebug(one2edit.elements.ElementQuery.DEBUG_FLAG)) {
      console.info("[one2edit.elements.ElementQuery/_createElement]", "data:", data, "result:", result);
    }
    return result;
  },
  _createResult: function(data) {
    if (one2edit.isType(data, "array")) {
      this._result = [];
      var element;
      for (var i = 0, l = data.length; i < l; i++) {
        try {
          var v = data[i];
          if (!(element = this._getElement(v))) {
            element = this._createElement(v);
          }
          if (element) {
            this._result.push(element);
          } else {
            if (one2edit.isDebug(one2edit.elements.ElementQuery.DEBUG_FLAG)) {
              console.warn("[ElementQuery/_createResult] Element not found!", v);
            }
          }
        } catch (e) {
          if (one2edit.isDebug(one2edit.elements.ElementQuery.DEBUG_FLAG)) {
            console.error("[ElementQuery/_createResult]", e);
          }
          throw e;
        }
      }
    } else {
      this._result = this._createElement(data);
    }
    if (one2edit.isDebug(one2edit.elements.ElementQuery.DEBUG_FLAG)) {
      console.log("[ElementQuery/_createResult]", "this._result:", this._result);
    }
    this._complete = true;
  },
  _onElementQueryComplete: function(event) {
    if (one2edit.isDebug(one2edit.elements.ElementQuery.DEBUG_FLAG)) {
      console.log("[ElementQuery/_onElementQueryComplete]");
    }
    this._createResult(event.data("result"));
  }
});
one2edit.elements.Element = function(properties) {
  one2edit.ui.UIComponent.apply(this, arguments);
};
one2edit.utils.ObjectUtil.extend(one2edit.elements.Element.prototype, one2edit.ui.UIComponent.prototype, {
  _className: "one2edit.elements.Element",
  deleteElement: function() {
    return one2edit.editor.elements.deleteElementsById(this.properties("id"));
  }
});
one2edit.elements.HierarchyElement = function(properties) {
  one2edit.elements.Element.apply(this, arguments);
};
one2edit.utils.ObjectUtil.extend(one2edit.elements.HierarchyElement.prototype, one2edit.elements.Element.prototype, {
  _className: "one2edit.elements.HierarchyElement",
  parent: function(handler) {
    return one2edit.editor.elements.getParent(this.properties("id"), this.properties("type"), handler);
  },
  children: function(handler) {
    return one2edit.editor.elements.getChildren(this.properties("id"), this.properties("type"), handler);
  }
});
one2edit.elements.SegmentElement = function(properties) {
  one2edit.elements.Element.apply(this, arguments);
};
one2edit.elements.SegmentElement.DEBUG_FLAG = one2edit.getDebugFlag();
one2edit.utils.ObjectUtil.extend(one2edit.elements.SegmentElement.prototype, one2edit.elements.Element.prototype, {
  _className: "one2edit.elements.SegmentElement",
  name: function(value) {
    if (one2edit.isDefined(value)) {
      return one2edit.call("editor.elements.setSegmentElementName", {
        id: this.id(),
        name: value
      });
    }
    return one2edit.call("editor.elements.getSegmentElementName", {
      id: this.id()
    });
  },
  reference: function() {
    return this.properties("reference");
  },
  plainText: function(value, autoRefresh) {
    var args = {
      id: this.id(),
      format: "tagged"
    };
    if (value !== undefined) {
      args.content = value;
      args.autoRefresh = autoRefresh || false;
      args.validate = false;
      return one2edit.call("editor.elements.setSegmentElementContent", args);
    }
    return one2edit.call("editor.elements.getSegmentElementContent", args);
  },
  text: function(value, autoRefresh) {
    var args = {
      id: this.id(),
      format: "plain"
    };
    if (value !== undefined) {
      args.content = value;
      args.autoRefresh = autoRefresh || false;
      args.validate = true;
      return one2edit.call("editor.elements.setSegmentElementContent", args);
    }
    return one2edit.call("editor.elements.getSegmentElementContent", args);
  },
  taggedText: function(value, autoRefresh, callback) {
    var args = {
      id: this.id(),
      format: "tagged"
    };
    if (value !== undefined) {
      args.content = value;
      args.autoRefresh = autoRefresh || false;
      args.validate = true;
      return one2edit.call("editor.elements.setSegmentElementContent", args);
    }
    return one2edit.call("editor.elements.getSegmentElementContent", args);
  },
  sourceText: function() {
    var args = {
      id: this.id(),
      format: "source"
    };
    return one2edit.call("editor.elements.getSegmentElementContent", args);
  },
  sourceTaggedText: function() {
    var args = {
      id: this.id(),
      format: "sourcetagged"
    };
    return one2edit.call("editor.elements.getSegmentElementContent", args);
  }
});
delete one2edit.elements.SegmentElement.prototype.deleteElement;
one2edit.elements.ImageElement = function(properties) {
  one2edit.elements.HierarchyElement.apply(this, arguments);
};
one2edit.elements.ImageElement.DEBUG_FLAG = one2edit.getDebugFlag();
one2edit.elements.ImageElement.LINK_STATE_NORMAL = "NORMAL";
one2edit.elements.ImageElement.LINK_STATE_OUTDATED = "OUTDATED";
one2edit.elements.ImageElement.LINK_STATE_MISSING = "MISSING";
one2edit.elements.ImageElement.LINK_STATE_EMBEDDED = "EMBEDDED";
one2edit.utils.ObjectUtil.extend(one2edit.elements.ImageElement.prototype, one2edit.elements.HierarchyElement.prototype, {
  _className: "one2edit.elements.ImageElement",
  relink: function(projectId, assetIdentifier, autoRefresh) {
    var args = {
      id: this.id(),
      projectId: projectId,
      assetIdentifier: assetIdentifier
    };
    if (one2edit.isDefined(autoRefresh)) {
      args.autoRefresh = autoRefresh.toString();
    }
    return one2edit.call("editor.elements.relinkImageElement", args);
  },
  uri: function() {
    return one2edit.call("editor.elements.getImageElementPath", {
      id: this.id(),
      format: "uri"
    });
  },
  path: function() {
    return one2edit.call("editor.elements.getImageElementPath", {
      id: this.id(),
      format: "path"
    });
  },
  baseName: function() {
    return one2edit.call("editor.elements.getImageElementPath", {
      id: this.id(),
      format: "baseName"
    });
  },
  assetProjectId: function() {
    return one2edit.call("editor.elements.getImageElementPath", {
      id: this.id(),
      format: "assetProjectId"
    });
  },
  assetIdentifier: function() {
    return one2edit.call("editor.elements.getImageElementPath", {
      id: this.id(),
      format: "assetIdentifier"
    });
  },
  linkState: function() {
    return one2edit.call("editor.elements.getImageElementLinkState", {
      id: this.id()
    });
  },
  name: function(value) {
    if (one2edit.isDefined(value)) {
      return one2edit.call("editor.elements.setImageElementName", {
        id: this.id(),
        name: value
      });
    }
    return one2edit.call("editor.elements.getImageElementName", {
      id: this.id()
    });
  },
  source: function(value) {
    if (value === undefined) {
      return one2edit.call("editor.elements.getImageElementSource", {
        id: this.id()
      });
    } else {
      var args = one2edit.utils.ObjectUtil.extend({
        id: this.id()
      }, value);
      return one2edit.call("editor.elements.setImageElementSource", args);
    }
  }
});
one2edit.elements.FrameElement = function(properties) {
  one2edit.elements.HierarchyElement.apply(this, arguments);
};
one2edit.elements.FrameElement.DEBUG_FLAG = one2edit.getDebugFlag();
one2edit.utils.ObjectUtil.extend(one2edit.elements.FrameElement.prototype, one2edit.elements.HierarchyElement.prototype, {
  _className: "one2edit.elements.FrameElement"
});
one2edit.elements.GroupElement = function(properties) {
  one2edit.elements.HierarchyElement.apply(this, arguments);
};
one2edit.elements.GroupElement.DEBUG_FLAG = one2edit.getDebugFlag();
one2edit.utils.ObjectUtil.extend(one2edit.elements.GroupElement.prototype, one2edit.elements.HierarchyElement.prototype, {
  _className: "one2edit.elements.GroupElement"
});
one2edit.elements.LayerElement = function(properties) {
  one2edit.elements.Element.apply(this, arguments);
};
one2edit.elements.LayerElement.DEBUG_FLAG = one2edit.getDebugFlag();
one2edit.utils.ObjectUtil.extend(one2edit.elements.LayerElement.prototype, one2edit.elements.Element.prototype, {
  _className: "one2edit.elements.LayerElement",
  color: function(value) {
    if (one2edit.isDefined(value)) {
      return one2edit.call("editor.elements.setLayerElementProperty", {
        id: this.id(),
        property: "color",
        value: value
      });
    }
    return one2edit.call("editor.elements.getLayerElementProperty", {
      id: this.id(),
      property: "color"
    });
  },
  visible: function(value) {
    if (one2edit.isDefined(value)) {
      return one2edit.call("editor.elements.setLayerElementProperty", {
        id: this.id(),
        property: "visible",
        value: value
      });
    }
    return one2edit.call("editor.elements.getLayerElementProperty", {
      id: this.id(),
      property: "visible"
    });
  },
  locked: function(value) {
    if (one2edit.isDefined(value)) {
      return one2edit.call("editor.elements.setLayerElementProperty", {
        id: this.id(),
        property: "locked",
        value: value
      });
    }
    return one2edit.call("editor.elements.getLayerElementProperty", {
      id: this.id(),
      property: "locked"
    });
  },
  printable: function(value) {
    if (one2edit.isDefined(value)) {
      return one2edit.call("editor.elements.setLayerElementProperty", {
        id: this.id(),
        property: "printable",
        value: value
      });
    }
    return one2edit.call("editor.elements.getLayerElementProperty", {
      id: this.id(),
      property: "printable"
    });
  }
});
one2edit.elements.SpreadElement = function(properties) {
  one2edit.elements.HierarchyElement.apply(this, arguments);
};
one2edit.elements.SpreadElement.DEBUG_FLAG = one2edit.getDebugFlag();
one2edit.utils.ObjectUtil.extend(one2edit.elements.SpreadElement.prototype, one2edit.elements.HierarchyElement.prototype, {
  _className: "one2edit.elements.SpreadElement"
});
one2edit.elements.SpreadLayerElement = function(properties) {
  one2edit.elements.HierarchyElement.apply(this, arguments);
};
one2edit.elements.SpreadLayerElement.DEBUG_FLAG = one2edit.getDebugFlag();
one2edit.utils.ObjectUtil.extend(one2edit.elements.SpreadLayerElement.prototype, one2edit.elements.HierarchyElement.prototype, {
  _className: "one2edit.elements.SpreadLayerElement",
  name: function() {
    return this.properties("name");
  }
});
one2edit.elements.LabelElement = function(properties) {
  one2edit.data.Properties.apply(this, arguments);
};
one2edit.elements.LabelElement.DEBUG_FLAG = one2edit.getDebugFlag();
one2edit.utils.ObjectUtil.extend(one2edit.elements.LabelElement.prototype, one2edit.data.Properties.prototype, {
  _className: "one2edit.elements.LabelElement"
});
one2edit.elements.TableElement = function(properties) {
  one2edit.elements.HierarchyElement.apply(this, arguments);
};
one2edit.elements.TableElement.DEBUG_FLAG = one2edit.getDebugFlag();
one2edit.utils.ObjectUtil.extend(one2edit.elements.TableElement.prototype, one2edit.elements.HierarchyElement.prototype, {
  _className: "one2edit.elements.TableElement"
});
(function() {
  var _object = null;
  var _initialized = false;
  var _editorInitialized = false;
  var _isLoggedOut = true;
  var _options = {
    swfFilename: "One2edit.swf",
    swfLocation: null,
    version: null,
    location: null,
    autoCreate: false,
    elementId: "flashContent",
    preferredVersion: null,
    loadCSS: false,
    loadHistory: true,
    singleSignOn: false,
    promptOnWindowClose: false,
    clipboardDataSupported: true,
    mouseWheelNotifier: true,
    onInitialize: null,
    onEditorInitialize: null,
    onCreationComplete: null,
    onMethodExecute: null,
    onPropertyChange: null,
    onLogout: null
  };
  var _swfParameters = {
    quality: "high",
    bgcolor: "#EEEEEE",
    allowscriptaccess: "always",
    allowfullscreen: "true",
    menu: "false"
  };
  var _swfAttributes = {
    id: "One2edit",
    name: "One2edit",
    align: "middle"
  };
  var _swfFlashvars = {};
  var _versionsAvailable = ["11.1"];
  var _versionCurrent = null;
  var _requestVariables = {};
  var _originalElement;
  var _browser = {
    mz: /Gecko\/?\d+/.test(navigator.userAgent),
    ie: (/MSIE/.test(navigator.userAgent) && window.clipboardData),
    sf: /AppleWebKit/.test(navigator.userAgent),
    op: !!window.opera
  };
  if (_browser.sf || _browser.op || _browser.mz) {
    _options.clipboardDataSupported = false;
  }
  var _getFile = function one2edit__getFile(filename, location) {
    location = location || _options.location;
    return location + (/\/$/.test(location) ? "" : "/") + filename;
  };
  one2edit.call = function one2edit__call(cmd, args) {
    var result = (typeof args == "undefined") ? _object.callJson(cmd) : _object.callJson(cmd, JSON.stringify(args));
    if (one2edit.isDebug(one2edit.DEBUG_FLAG)) {
      console.group("[one2edit/_doCall]");
      console.log("cmd:", cmd);
      console.log("args:", args);
      console.log("result:", result);
      console.groupEnd();
    }
    result = JSON.parse(result);
    if (!result.success) {
      throw new Error(result.message);
    }
    return result.result;
  };
  window.onbeforeunload = function one2edit_window_onbeforeunload() {
    if (_options.promptOnWindowClose) {
      return "You have an active one2edit session.\n If you close this window, your unsaved changes will get lost.";
    }
    return void(0);
  };
  (function() {
    if (!(/Mac(intosh)?/i.test(navigator.userAgent)) || !_options.mouseWheelNotifier) {
      return;
    }
    var eventName = (window.onmousewheel === null || window.opera) ? "mousewheel" : "DOMMouseScroll";
    var eventHandler = function(event) {
      if (!_object || !_object.onMouseWheel) {
        return true;
      }
      if (_object != event.target) {
        return true;
      }
      var deltaX = 0;
      var deltaY = 0;
      event = event || window.event;
      if ("wheelDelta" in event || "wheelDeltaY" in event) {
        if ("wheelDeltaY" in event) {
          deltaY = event.wheelDeltaY / 12;
        } else {
          if ("wheelDelta" in event) {
            deltaY = event.wheelDelta / 12;
          }
        }
        if ("wheelDeltaX" in event) {
          deltaX = event.wheelDeltaX / 12;
        }
        if (window.opera) {
          deltaY = -deltaY;
          deltaX = -deltaX;
        }
      } else {
        if ("detail" in event) {
          switch ("axis" in event ? event.axis : false) {
            default:
              case event.VERTICAL_AXIS:
              deltaY = -event.detail;
            break;
            case event.HORIZONTAL_AXIS:
                deltaX = -event.detail;
              break;
          }
        }
      }
      if (deltaY != 0 || deltaX != 0) {
        _object.onMouseWheel(deltaY, deltaX);
      }
      event.stopPropagation();
      event.preventDefault();
      event.cancelBubble = false;
      return false;
    };
    window.addEventListener(eventName, eventHandler, false);
  })();
  var _onSwfObjectComplete = function one2edit__onSwfObjectComplete(response) {
    _object = response.ref;
    _initialized = response.success;
    if (one2edit.isType(_options.onCreationComplete, "function")) {
      _options.onCreationComplete.call(this, response);
    }
  };
  var _onInitialize = function one2edit__onInitialize(event) {};
  var _onEditorInitialize = function one2edit__onEditorInitialize(event) {
    _editorInitialized = true;
  };
  var _onPropertyChange = function one2edit__onPropertyChange(event) {};
  var _onMethodExecute = function one2edit__onMethodExecute(event) {};
  var _onUIComponentEvent = function one2edit__onUIComponentEvent(event) {
    var Class = one2edit.utils.ObjectUtil.resolve(event.data("className"), one2edit);
    if (one2edit.ui.UIComponent.getInstancesByClass(Class).hasOwnProperty(event.data("id"))) {
      var instance = one2edit.ui.UIComponent.getInstancesByClass(Class)[event.data("id")];
      instance.dispatchEvent(event.data("eventKind"), event.data());
    }
  };
  var _onElementEvent = function one2edit__onElementEvent(event) {
    switch (event.data("eventKind")) {
      case one2edit.events.ElementEvent.ELEMENT_QUERY_COMPLETE:
        var Class = one2edit.elements.ElementQuery;
        if (one2edit.ui.UIComponent.getInstancesByClass(Class).hasOwnProperty(event.data("uid"))) {
          var instance = one2edit.ui.UIComponent.getInstancesByClass(Class)[event.data("uid")];
          instance.dispatchEvent(one2edit.events.ElementEvent.ELEMENT_QUERY_COMPLETE, event.data());
        }
        break;
    }
  };
  var _onResultEvent = function(event) {
    one2edit.events.ResultEvent.handle(event.data());
  };
  var _onSelectionChange = function one2edit__oneSelectionChange(event) {
    var origin = event.data("result");
    var result = new one2edit.elements.ElementQuery({
      id: "selectedElements"
    });
    result.dispatchEvent(one2edit.events.ElementEvent.ELEMENT_QUERY_COMPLETE, {
      result: origin
    });
    event.data("elements", result);
  };
  var _onBeforeSelectionChange = function one2edit__oneBeforeSelectionChange(event) {
    var origin = event.data("result");
    var result = new one2edit.elements.ElementQuery({
      id: "selectedElements"
    });
    result.dispatchEvent(one2edit.events.ElementEvent.ELEMENT_QUERY_COMPLETE, {
      result: origin
    });
    event.data("elements", result);
  };
  var _onSegmentContentChange = function one2edit__onSegmentContentChange(event) {
    var origin = event.data("result");
    var result = new one2edit.elements.ElementQuery({
      id: "segmentContentChange"
    });
    result.dispatchEvent(one2edit.events.ElementEvent.ELEMENT_QUERY_COMPLETE, {
      result: origin,
      content: event.data("content")
    });
    event.data("elements", result);
  };
  var _onSpreadChange = function one2edit__oneSpreadChange(event) {};
  one2edit.VIEW_LOGIN = 0;
  one2edit.VIEW_OVERVIEW = 1;
  one2edit.VIEW_EDITOR_WORKFLOW = 3;
  one2edit.VIEW_DIFF = 4;
  one2edit.VIEW_EDITOR_WORKFLOW_DOCUMENT = 6;
  one2edit.VIEW_INFO = 7;
  one2edit.VIEW_EDITOR_DOCUMENT = 9;
  one2edit.VIEW_EDITOR_JOB = 10;
  one2edit.isInitialized = function() {
    return _initialized;
  };
  one2edit.object = function() {
    return _object;
  };
  one2edit.create = function one2edit_create(settings) {
    console.log("In create");
    one2edit.ready(function() {
      if (_initialized) {
        throw new Error("one2edit already initalized!");
      }
      for (var n in settings) {
        if (one2edit.hasOwnProperty(n) && one2edit.isType(settings[n], "object")) {
          one2edit[n](settings[n]);
        }
      }
      if (one2edit.options("singleSignOn") && !one2edit.flashvars("sessionId")) {
        var api = new one2edit.net.ServerApi({});
        console.log('Trying to authorise user');
        api.request("user.auth", {
          wwwAuthenticate: false
        }, function(data) {
          if (data instanceof one2edit.net.ServerApiResult) {
            one2edit.flashvars("sessionId", data.asXML().documentElement.getElementsByTagName("session")[0].textContent);
          }
          one2edit.options("singleSignOn", false);
          one2edit.create({});
        });
        return;
      }
      var width = (_swfAttributes.hasOwnProperty("width")) ? _swfAttributes.width : "100%";
      var height = (_swfAttributes.hasOwnProperty("height")) ? _swfAttributes.height : "100%";
      if (_options.loadCSS) {
        one2edit.net.Loader.load(_getFile("css/one2edit.css"));
      }
      if (_options.loadHistory) {
        one2edit.net.Loader.load(_getFile("scripts/history/history.js"));
        one2edit.net.Loader.load(_getFile("scripts/history/history.css"));
      }
      one2edit.net.Loader.load(_getFile("scripts/swfobject.js"), function() {
        var filename = _getFile(_options.swfFilename, _options.swfLocation);
        var minVersion = _versionsAvailable[_versionsAvailable.length - 1] || "0.0.0";
        if (one2edit.getSWFVersion(_options.preferredVersion).length > 0) {
          filename = filename.replace(/\.swf$/, "-" + _versionCurrent + ".swf");
        }
        if (_options.version) {
          filename += "?version=" + _options.version;
        }
        if (one2edit.isDebug(one2edit.DEBUG_FLAG)) {
          console.group("[one2edit/create]");
          console.log("swf-file:", filename);
          console.log("minimumVersion", minVersion);
          console.log("currentVersion:", _versionCurrent);
          console.log("_swfFlashvars:", _swfFlashvars);
          console.log("_swfParameters:", _swfParameters);
          console.log("_swfAttributes:", _swfAttributes);
          console.groupEnd();
          filename += "?time=" + (new Date()).getTime();
        }
        _originalElement = document.getElementById(_options.elementId);
        swfobject.embedSWF(filename, _options.elementId, width, height, minVersion, "./swf/playerProductInstall.swf", one2edit.utils.ObjectUtil.flatten(_swfFlashvars), _swfParameters,
          _swfAttributes, _onSwfObjectComplete);
        swfobject.createCSS("#" + _options.elementId, "display: block;");
      });
    });
  };
  one2edit.destroy = function() {
    if (_initialized) {
      var element = document.getElementById(_swfAttributes.id);
      var sibling = element.nextSibling;
      var parent = element.parentNode;
      swfobject.removeSWF(_swfAttributes.id);
      if (!parent.hasChildNodes() || !sibling) {
        parent.appendChild(_originalElement);
      } else {
        if (sibling) {
          parent.insertBefore(_originalElement, sibling);
        }
      }
      _initialized = false;
    } else {
      throw new Error("one2edit is not initalized!");
    }
  };
  one2edit.logout = function one2edit_logout(callback) {
    if (callback instanceof Function) {
      one2edit.events.EventDispatcher.createCallback(one2edit, one2edit.events.Event.LOGOUT, callback);
    }
    return !!one2edit.call("logout");
  };
  one2edit.openAssetBrowser = function one2edit_openAssetBrowser(assetProjectId, assetIdentifier) {
    if (!one2edit.isDefined(assetProjectId)) {
      assetProjectId = 0;
    }
    if (!one2edit.isDefined(assetIdentifier)) {
      assetIdentifier = null;
    }
    one2edit.call("openAssetBrowser", {
      projectId: assetProjectId,
      identifier: assetIdentifier
    });
  };
  one2edit.openView = function one2edit_openView(view) {
    return one2edit.call("openView", {
      view: view
    });
  };
  one2edit.view = function one2edit_view() {
    return one2edit.call("view");
  };
  one2edit.clientId = function one2edit_clientId() {
    return one2edit.call("clientId");
  };
  one2edit.sessionId = function one2edit_sessionId() {
    return one2edit.call("sessionId");
  };
  one2edit.options = function one2edit_options(name, value) {
    switch (name) {
      case "server":
        this.flashvars("server", value);
        break;
    }
    return one2edit.utils.ObjectUtil.getterSetter(_options, name, value);
  };
  one2edit.flashvars = function one2edit_flashvars(name, value) {
    if (one2edit.isType(name, "object") && one2edit.isDefined(name.companyId) && !one2edit.isDefined(name.clientId)) {
      name.clientId = name.companyId;
      delete name.companyId;
    } else {
      if (name == "companyId") {
        name = "clientId";
      }
    }
    if (one2edit.isType(name, "object") && one2edit.isDefined(name.one2edit) && !one2edit.isDefined(name.server)) {
      name.server = name.one2edit;
      delete name.one2edit;
    } else {
      if (name == "one2edit") {
        name = "server";
      }
    }
    return one2edit.utils.ObjectUtil.getterSetter(_swfFlashvars, name, value);
  };
  one2edit.parameters = function one2edit_parameters(name, value) {
    return one2edit.utils.ObjectUtil.getterSetter(_swfParameters, name, value);
  };
  one2edit.attributes = function one2edit_attributes(name, value) {
    return one2edit.utils.ObjectUtil.getterSetter(_swfAttributes, name, value);
  };
  one2edit.requestVariables = function one2edit_requestVariables(name) {
    if (!one2edit.isDefined(name)) {
      return _requestVariables;
    }
    return (_requestVariables.hasOwnProperty(name)) ? _requestVariables[name] : null;
  };
  one2edit.getSWFVersion = function one2edit_getSWFVersion(preferredVersion) {
    if (preferredVersion === null) {
      var search = [];
      var result = [];
      var version = swfobject.getFlashPlayerVersion();
      var i, l, vt;
      for (i = 0, vt = ["major", "minor", "release"], l = vt.length; i < l; i++) {
        search.push(version[vt[i]]);
      }
      for (i = 0, l = _versionsAvailable.length; i < l; i++) {
        var current = _versionsAvailable[i].split(".");
        if (search >= current) {
          result = current;
          break;
        }
      }
      _versionCurrent = (result.length) ? result.join(".") : _versionsAvailable[0] || "";
    } else {
      _versionCurrent = preferredVersion || "";
    }
    return _versionCurrent;
  };
  one2edit.getClipboardData = function one2edit_getClipboardData() {
    var result = "";
    if (!_options.clipboardDataSupported) {
      return result;
    }
    if (_browser.ie) {
      result = window.clipboardData.getData("Text");
    }
    return result;
  };
  one2edit.browser = function one2edit_browser(browser) {
    if (_browser.hasOwnProperty(browser)) {
      return _browser[browser];
    }
    return false;
  };
  one2edit.editor = {
    CLOSE_BEHAVIOR_NONE: 0,
    CLOSE_BEHAVIOR_EXIT: 1,
    CLOSE_BEHAVIOR_CLOSE: 1,
    CLOSE_BEHAVIOR_LOGOUT: 2,
    CLOSE_BEHAVIOR_EXIT_AND_LOGOUT: 3,
    PLACE_POSITION_DEFAULT: 0,
    PLACE_POSITION_TOP_LEFT: 1,
    PLACE_POSITION_REPLACE: 2,
    PLACE_POSITION_TOP_LEFT_ORIGINAL: 3,
    PLACE_POSITION_REPLACE_ORIGINAL: 4,
    CLOSE_MODE_SAVE_ASK: 0,
    CLOSE_MODE_SAVE: 1,
    CLOSE_MODE_DISCARD: 2,
    isInitialized: function editor_intialized() {
      return _editorInitialized;
    },
    documentId: function editor_documentId() {
      return one2edit.call("editor.documentId");
    },
    hasChanges: function editor_hasChanges() {
      return one2edit.call("editor.hasChanges");
    },
    protectLock: function editor_protectLock(value) {
      return one2edit.call("editor.protectLock", value);
    },
    open: function editor_open(documentId) {
      return one2edit.call("editor.open", {
        documentId: documentId
      });
    },
    close: function editor_close(callback, mode) {
      if (callback instanceof Function) {
        one2edit.events.EventDispatcher.createCallback(one2edit, one2edit.events.Event.EDITOR_CLOSE, callback);
      }
      if (!one2edit.isDefined(mode)) {
        mode = one2edit.editor.CLOSE_MODE_SAVE_ASK;
      }
      return one2edit.call("editor.close", {
        mode: mode
      });
    },
    save: function editor_save(callback) {
      if (callback instanceof Function) {
        one2edit.events.EventDispatcher.createCallback(one2edit, one2edit.events.Event.EDITOR_SAVE, callback);
      }
      return one2edit.call("editor.save");
    },
    pdf: function editor_pdf(options) {
      return one2edit.call("editor.pdf", {
        options: options
      });
    },
    refresh: function editor_refresh() {
      return one2edit.call("editor.refresh");
    },
    refreshBegin: function editor_refreshBegin() {
      return one2edit.call("editor.refreshBegin");
    },
    refreshEnd: function editor_refreshEnd() {
      return one2edit.call("editor.refreshEnd");
    },
    openPlace: function editor_openPlace() {
      one2edit.call("editor.openPlace");
    },
    place: function editor_place(assetProject, assetIdentifier, placePosition, positionX, positionY, layer, contentGroup, callback, spread) {
      if (arguments.length === 3 && one2edit.utils.ObjectUtil.isObject(placePosition)) {
        var namedArguments = placePosition;
        placePosition = namedArguments.placePosition;
        positionX = namedArguments.positionX;
        positionY = namedArguments.positionY;
        layer = namedArguments.layer;
        contentGroup = namedArguments.contentGroup;
        callback = namedArguments.callback;
        spread = namedArguments.spread;
      }
      var uid = "place".concat(assetProject, ":", assetIdentifier, ":", (new Date()).getTime().toString(), Math.random().toString());
      var result = new one2edit.elements.ElementQuery({
        id: uid,
        onElementQueryComplete: callback
      });
      if (!one2edit.isDefined(placePosition)) {
        placePosition = one2edit.editor.PLACE_POSITION_DEFAULT;
      }
      if (!one2edit.isDefined(positionX)) {
        positionX = null;
      }
      if (!one2edit.isDefined(positionY)) {
        positionY = null;
      }
      if (!one2edit.isDefined(spread)) {
        spread = null;
      }
      if (layer instanceof one2edit.elements.LayerElement) {
        layer = layer.properties("id");
      }
      one2edit.call("editor.place", {
        uid: uid,
        assetProject: assetProject,
        assetIdentifier: assetIdentifier,
        placePosition: placePosition,
        positionX: positionX,
        positionY: positionY,
        layerId: layer,
        contentGroup: contentGroup,
        spread: spread
      });
      return result;
    },
    fitContent: function editor_fitContent(width, height) {
      return one2edit.call("editor.fitContent", {
        width: width,
        height: height
      });
    },
    zoom: function editor_setzoom(value) {
      return one2edit.call("editor.zoom", value);
    },
    previewMode: function editor_previewMode(value) {
      return one2edit.call("editor.previewMode", value);
    },
    replace: function editor_replace(id, assetProject, assetIdentifier, placePosition, positionX, positionY, layer, contentGroup, callback) {
      if (arguments.length === 4 && one2edit.utils.ObjectUtil.isObject(placePosition)) {
        var namedArguments = placePosition;
        placePosition = namedArguments.placePosition;
        positionX = namedArguments.positionX;
        positionY = namedArguments.positionY;
        layer = namedArguments.layer;
        contentGroup = namedArguments.contentGroup;
        callback = namedArguments.callback;
      }
      var uid = "replace".concat(assetProject, ":", assetIdentifier, ":", (new Date()).getTime().toString(), Math.random().toString());
      var result = new one2edit.elements.ElementQuery({
        id: uid,
        onElementQueryComplete: callback
      });
      if (!one2edit.isDefined(placePosition)) {
        placePosition = one2edit.editor.PLACE_POSITION_REPLACE;
      }
      if (!one2edit.isDefined(positionX)) {
        positionX = null;
      }
      if (!one2edit.isDefined(positionY)) {
        positionY = null;
      }
      if (layer instanceof one2edit.elements.LayerElement) {
        layer = layer.properties("id");
      }
      one2edit.call("editor.place", {
        uid: uid,
        id: id,
        assetProject: assetProject,
        assetIdentifier: assetIdentifier,
        placePosition: placePosition,
        positionX: positionX,
        positionY: positionY,
        layerId: layer,
        contentGroup: contentGroup
      });
      return result;
    },
    showMenu: function editor_showMenu(value) {
      return one2edit.call("editor.showMenu", value);
    },
    showVersionTools: function editor_showVersionTools(value) {
      return one2edit.call("editor.showVersionTools", value);
    },
    closeBehavior: function editor_closeBehavior(value) {
      return one2edit.call("editor.closeBehavior", value);
    },
    editSession: function editor_editSession() {
      return one2edit.call("editor.editSession");
    },
    panel: new one2edit.ui.ElementGroup({
      id: "egPanel",
      path: "editor.panel"
    }),
    toolbar: new one2edit.ui.ElementGroup({
      id: "egToolbar",
      path: "editor.toolbar"
    }),
    spreads: {
      visible: function spreads_visbile(value) {
        return one2edit.call("editor.spreads.visible", value);
      },
      show: function spreads_show(value) {
        return one2edit.call("editor.spreads.show", value);
      }
    },
    elements: {
      getAllElements: function(type, callback) {
        var uid = "getElementById".concat(name, ":", type, ":", (new Date()).getTime().toString());
        var result = new one2edit.elements.ElementQuery({
          id: uid,
          onElementQueryComplete: callback
        });
        one2edit.call("editor.elements.getAllElements", {
          type: type,
          uid: uid
        });
        return result;
      },
      getAllLayers: function(callback) {
        return this.getAllElements(one2edit.elements.LAYER_ELEMENT, callback);
      },
      getElementById: function(id, type, callback) {
        var uid = "getElementById".concat(name, ":", type, ":", (new Date()).getTime().toString());
        var result = new one2edit.elements.ElementQuery({
          id: uid,
          onElementQueryComplete: callback
        });
        one2edit.call("editor.elements.getElementById", {
          id: id,
          type: type,
          uid: uid
        });
        return result;
      },
      getChildren: function(id, type, callback, childTypes, depth) {
        if (id !== null && ((id instanceof Object) || typeof id === "object")) {
          type = id.properties("type");
          id = id.properties("id");
        }
        var uid = "getChildren".concat(id, ":", type, ":", childTypes, ":", depth, ":", (new Date()).getTime().toString());
        var result = new one2edit.elements.ElementQuery({
          id: uid,
          onElementQueryComplete: callback
        });
        one2edit.call("editor.elements.getChildren", {
          id: id,
          type: type,
          childTypes: childTypes,
          depth: depth,
          uid: uid
        });
        return result;
      },
      getParent: function(id, type, callback, parentTypes) {
        if (id !== null && ((id instanceof Object) || typeof id === "object")) {
          type = id.properties("type");
          id = id.properties("id");
        }
        var uid = "getParent".concat(id, ":", type, ":", (new Date()).getTime().toString());
        var result = new one2edit.elements.ElementQuery({
          id: uid,
          onElementQueryComplete: callback
        });
        one2edit.call("editor.elements.getParent", {
          id: id,
          type: type,
          parentTypes: parentTypes,
          uid: uid
        });
        return result;
      },
      getSegmentById: function(id, callback) {
        return this.getElementById(id, one2edit.elements.SEGMENT_ELEMENT, callback);
      },
      getImageById: function(id, callback) {
        return this.getElementById(id, one2edit.elements.IMAGE_ELEMENT, callback);
      },
      getFrameById: function(id, callback) {
        return this.getElementById(id, one2edit.elements.FRAME_ELEMENT, callback);
      },
      getGroupById: function(id, callback) {
        return this.getElementById(id, one2edit.elements.GROUP_ELEMENT, callback);
      },
      getLayerById: function(id, callback) {
        return this.getElementById(id, one2edit.elements.LAYER_ELEMENT, callback);
      },
      getElementsByName: function(name, type, callback) {
        var uid = "getElementsByName".concat(name, ":", type, ":", (new Date()).getTime().toString());
        var result = new one2edit.elements.ElementQuery({
          id: uid,
          onElementQueryComplete: callback
        });
        one2edit.call("editor.elements.getElementsByName", {
          name: name,
          type: type,
          uid: uid
        });
        return result;
      },
      getSegmentsByName: function(name, callback) {
        return this.getElementsByName(name, one2edit.elements.SEGMENT_ELEMENT, callback);
      },
      getImagesByName: function(name, callback) {
        return this.getElementsByName(name, one2edit.elements.IMAGE_ELEMENT, callback);
      },
      getElementsByLabel: function(label, value, types, callback) {
        var uid = "getElementsByLabel".concat(name, ":", types, ":", (new Date()).getTime().toString());
        var result = new one2edit.elements.ElementQuery({
          id: uid,
          onElementQueryComplete: callback
        });
        one2edit.call("editor.elements.getElementsByLabel", {
          label: label,
          value: value,
          types: types,
          uid: uid
        });
        return result;
      },
      getFramesByLabel: function(label, value, callback) {
        return this.getElementsByLabel(label, value, one2edit.elements.FRAME_ELEMENT, callback);
      },
      getGroupsByLabel: function(label, value, callback) {
        return this.getElementsByLabel(label, value, one2edit.elements.GROUP_ELEMENT, callback);
      },
      deleteElementsById: function(ids) {
        if (arguments.length > 1 || !one2edit.isType(ids, "array")) {
          ids = Array.prototype.slice.call(arguments);
        }
        return one2edit.call("editor.elements.deleteElementsById", {
          ids: ids
        });
      },
      selectedElements: function(els) {
        var result = null;
        if (arguments.length > 1) {
          els = Array.prototype.slice.call(arguments);
        }
        if (!els) {
          result = new one2edit.elements.ElementQuery({
            id: "selectedElements"
          });
          result.dispatchEvent(one2edit.events.ElementEvent.ELEMENT_QUERY_COMPLETE, {
            result: one2edit.call("editor.elements.getSelectedElements")
          });
        } else {
          var out = [];
          for (var i = 0, l = els.length; i < l; i++) {
            var e = els[i];
            out.push({
              id: e.properties("id"),
              type: e.properties("type")
            });
          }
          one2edit.call("editor.elements.setSelectedElements", {
            elements: out
          });
        }
        return result;
      },
      getLabel: function(id, key, callback) {
        var uid = "getLabel".concat(name, ":", (new Date()).getTime().toString());
        var result = new one2edit.elements.ElementQuery({
          id: uid,
          onElementQueryComplete: callback
        });
        one2edit.call("editor.elements.getLabel", {
          id: id,
          key: key,
          uid: uid
        });
        return result;
      },
      getLabels: function(id, callback) {
        var uid = "getLabels".concat(name, ":", (new Date()).getTime().toString());
        var result = new one2edit.elements.ElementQuery({
          id: uid,
          onElementQueryComplete: callback
        });
        one2edit.call("editor.elements.getLabels", {
          id: id,
          uid: uid
        });
        return result;
      },
      setLabel: function(id, key, value, callback) {
        var uid = "setLabel".concat(name, ":", (new Date()).getTime().toString());
        var result = new one2edit.elements.ElementQuery({
          id: uid,
          onElementQueryComplete: callback
        });
        one2edit.call("editor.elements.setLabel", {
          id: id,
          key: key,
          value: value,
          uid: uid
        });
        return result;
      },
      deleteLabel: function(id, key, callback) {
        var uid = "deleteLabel".concat(name, ":", (new Date()).getTime().toString());
        var result = new one2edit.elements.ElementQuery({
          id: uid,
          onElementQueryComplete: callback
        });
        one2edit.call("editor.elements.deleteLabel", {
          id: id,
          key: key,
          uid: uid
        });
        return result;
      },
      getAllSpreads: function(callback) {
        var uid = "getAllSpreads".concat(name, ":", (new Date()).getTime().toString());
        var result = new one2edit.elements.ElementQuery({
          id: uid,
          onElementQueryComplete: callback
        });
        one2edit.call("editor.elements.getAllSpreads", {
          uid: uid
        });
        return result;
      },
      selectedSpread: function(spread) {
        var result = null;
        if (!spread && spread != 0) {
          result = new one2edit.elements.ElementQuery({
            id: "selectedSpread"
          });
          result.dispatchEvent(one2edit.events.ElementEvent.ELEMENT_QUERY_COMPLETE, {
            result: one2edit.call("editor.elements.selectedSpread")
          });
        } else {
          if (typeof spread == "object") {
            spread = spread.properties("id");
          }
          one2edit.call("editor.elements.setSelectedSpread", {
            spread: spread
          });
        }
        return result;
      }
    },
    imageEditor: {
      relink: function(projectId, assetIdentifier) {
        one2edit.call("editor.imageEditor.relink", {
          projectId: projectId,
          assetIdentifier: assetIdentifier
        });
      },
      startFitting: function() {
        one2edit.call("editor.imageEditor.startFitting");
      },
      cancel: function() {
        one2edit.call("editor.imageEditor.cancel");
      },
      apply: function() {
        one2edit.call("editor.imageEditor.apply");
      }
    },
    document: {
      width: function() {
        return one2edit.call("editor.document.width");
      },
      height: function() {
        return one2edit.call("editor.document.height");
      },
      originalWidth: function() {
        return one2edit.call("editor.document.originalWidth");
      },
      originalHeight: function() {
        return one2edit.call("editor.document.originalHeight");
      },
      transform: function editor_document_transform(width, height) {
        return one2edit.call("editor.document.transform", {
          width: width,
          height: height
        });
      }
    },
    dynamicLayoutEngine: {
      loaded: function() {
        return one2edit.call("editor.dynamicLayoutEngine.loaded");
      },
      sizeRestriction: function() {
        return one2edit.call("editor.dynamicLayoutEngine.sizeRestriction");
      },
      minWidth: function() {
        return one2edit.call("editor.dynamicLayoutEngine.minWidth");
      },
      minHeight: function() {
        return one2edit.call("editor.dynamicLayoutEngine.minHeight");
      },
      maxWidth: function() {
        return one2edit.call("editor.dynamicLayoutEngine.maxWidth");
      },
      maxHeight: function() {
        return one2edit.call("editor.dynamicLayoutEngine.maxHeight");
      },
      enabled: function(enabled) {
        return one2edit.call("editor.dynamicLayoutEngine.enabled", enabled);
      }
    }
  };
  one2edit.jobEditor = one2edit.utils.ObjectUtil.extend({}, one2edit.editor, {
    open: function jobEditor_open(jobId) {
      return one2edit.call("jobEditor.open", {
        jobId: jobId
      });
    },
    close: function jobEditor_close() {
      return one2edit.call("jobEditor.close");
    },
    jobId: function jobEditor_jobId() {
      return one2edit.call("jobEditor.jobId");
    },
    jobIds: function jobEditor_jobIds() {
      return one2edit.call("jobEditor.jobIds");
    },
    disableWorkflow: function jobEditor_disableWorkflow(value) {
      return one2edit.call("jobEditor.disableWorkflow", value);
    },
    status: {
      list: function() {
        return one2edit.call("jobEditor.status.list").map(function(item) {
          return new one2edit.data.WorkflowStatus(item);
        });
      },
      rejectStatus: function() {
        var item = one2edit.call("jobEditor.status.rejectStatus");
        if (item) {
          return new one2edit.data.WorkflowStatus(item);
        }
        return null;
      },
      userStatus: function() {
        return new one2edit.data.WorkflowStatus(one2edit.call("jobEditor.status.userStatus"));
      },
      acceptStatus: function() {
        return new one2edit.data.WorkflowStatus(one2edit.call("jobEditor.status.acceptStatus"));
      },
      reject: function(items, callback) {
        var status = one2edit.jobEditor.status.rejectStatus();
        if (!status) {
          throw new Error("Reject not possible.");
        }
        return one2edit.jobEditor.status.set(status, items, callback);
      },
      user: function(items, callback) {
        return one2edit.jobEditor.status.set(one2edit.jobEditor.status.userStatus(), items, callback);
      },
      accept: function(items, callback) {
        return one2edit.jobEditor.status.set(one2edit.jobEditor.status.acceptStatus(), items, callback);
      },
      set: function(status, items, callback) {
        var result = one2edit.events.ResultEvent.create(callback);
        var args = {
          uid: result.uid(),
          step: status.properties("step"),
          status: status.properties("status"),
          items: items.map(function(item) {
            return {
              type: item.properties("type"),
              id: item.id()
            };
          })
        };
        one2edit.call("jobEditor.status.setStatus", args);
        return result;
      },
      itemStatus: function(item) {
        var args = {
          type: item.properties("type"),
          id: item.id()
        };
        return one2edit.call("jobEditor.status.itemStatus", args);
      },
      get: function(item) {
        var args = {
          type: item.properties("type"),
          id: item.id()
        };
        var result = one2edit.call("jobEditor.status.getStatus", args);
        if (result) {
          result = new one2edit.data.WorkflowStatus(result);
        }
        return result;
      }
    }
  });
  for (var n in one2edit.events.EventDispatcher.prototype) {
    var value = one2edit.events.EventDispatcher.prototype[n];
    switch (one2edit.type(value)) {
      case "function":
        one2edit[n] = (function(value) {
          return function() {
            return value.apply(one2edit, arguments);
          };
        })(value);
        break;
      case "object":
        one2edit[n] = one2edit.utils.ObjectUtil.extend({}, value);
        break;
      default:
        one2edit[n] = value;
        break;
    }
  }
  one2edit._eventCallbackTarget = function() {
    return _options;
  };
  one2edit._createAndDispatchEvent = function(event, data) {
    var eventType = event;
    var eventClass = one2edit.events.Event;
    var eventObject = null;
    if (event.indexOf(".") > -1) {
      var path = event.split(".").slice(0, -1).join(".");
      eventType = one2edit.utils.ObjectUtil.resolve(event);
      eventClass = one2edit.utils.ObjectUtil.resolve(path);
    }
    eventObject = new eventClass(eventType, data);
    if (one2edit.isDebug(one2edit.DEBUG_FLAG)) {
      console.group("[one2edit/_createAndDispatchEvent]");
      console.info("eventObject:", eventObject);
      console.groupEnd();
    }
    return this.dispatchEvent(eventObject);
  };
  one2edit._createAndDispatchEventJson = function(event, data) {
    var result = one2edit._createAndDispatchEvent(event, JSON.parse(data));
    result = JSON.stringify(result);
    return result;
  };
  one2edit.addEventListener(one2edit.events.Event.INITIALIZE, _onInitialize);
  one2edit.addEventListener(one2edit.events.Event.PROPERTY_CHANGE, _onPropertyChange);
  one2edit.addEventListener(one2edit.events.Event.METHOD_EXECUTE, _onMethodExecute);
  one2edit.addEventListener(one2edit.events.Event.EDITOR_INITIALIZE, _onEditorInitialize);
  one2edit.addEventListener(one2edit.events.Event.UI_COMPONENT_EVENT, _onUIComponentEvent);
  one2edit.addEventListener(one2edit.events.Event.ELEMENT_EVENT, _onElementEvent);
  one2edit.addEventListener(one2edit.events.Event.RESULT_EVENT, _onResultEvent);
  one2edit.addEventListener(one2edit.events.Event.SELECTION_CHANGE, _onSelectionChange);
  one2edit.addEventListener(one2edit.events.Event.BEFORE_SELECTION_CHANGE, _onBeforeSelectionChange);
  one2edit.addEventListener(one2edit.events.Event.SEGMENT_CONTENT_CHANGE, _onSegmentContentChange);
  one2edit.addEventListener(one2edit.events.Event.SPREAD_CHANGE, _onSpreadChange);

  function _prepare() {
    if (one2edit.isDebug(one2edit.DEBUG_FLAG)) {
      console.group("[one2edit/_prepare]");
    }
    if (one2edit.isDebug(one2edit.DEBUG_FLAG)) {
      console.group("[one2edit/getSettingsFromRequest]");
    }
    var scripts = document.getElementsByTagName("script");
    for (var i = 0, l = scripts.length; i < l; i++) {
      if (scripts[i].src.match(/scripts\/one2edit\.js/)) {
        var src = scripts[i].src;
        if (!_options.location) {
          _options.location = src.split("/").slice(0, -2).join("/");
        }
        if (!_options.swfLocation) {
          _options.swfLocation = _options.location;
        }
        if (!_swfFlashvars.server) {
          _swfFlashvars.server = _options.location;
        }
        _requestVariables = one2edit.utils.ObjectUtil.createFromQuery(src.split(/\?/).pop());
        if (one2edit.isDebug(one2edit.DEBUG_FLAG)) {
          console.log("_requestVariables:", _requestVariables);
        }
        break;
      }
    }
    if (one2edit.isDebug(one2edit.DEBUG_FLAG)) {
      var searchVariables = one2edit.utils.ObjectUtil.createFromQuery(document.location.search);
      console.log("searchVariables:", searchVariables);
      one2edit.utils.ObjectUtil.extend(_requestVariables, searchVariables);
    }
    if (one2edit.isDebug(one2edit.DEBUG_FLAG)) {
      console.groupEnd();
    }
    if (one2edit.isDebug(one2edit.DEBUG_FLAG)) {
      console.group("[one2edit/applySettingsFromRequest]");
    }
    var objects = ["options", "flashvars", "parameters", "attributes"];
    for (var i = 0, l = objects.length; i < l; i++) {
      var object = objects[i];
      var result = {};
      var found = false;
      for (var n in _requestVariables) {
        if (n.toLowerCase().indexOf(object.toLowerCase()) == 0 && n.substr(object.length, 1) == ".") {
          found = true;
          result[n.substr(object.length + 1)] = _requestVariables[n];
        }
        if (object == "options") {
          if (/^(\d|\.)+$/.test(n)) {
            _options.version = n;
          } else {
            if (n == "version") {
              _options.version = _requestVariables[n];
            }
          }
        }
      }
      if (found && one2edit.hasOwnProperty(object)) {
        if (one2edit.isDebug(one2edit.DEBUG_FLAG)) {
          console.log(object, result);
        }
        one2edit[object](result);
      }
    }
    if (one2edit.isDebug(one2edit.DEBUG_FLAG)) {
      console.groupEnd();
    }
    if (one2edit.browser("ie") && typeof document.evaluate == "undefined") {
      if (one2edit.isDebug(one2edit.DEBUG_FLAG)) {
        console.info("Load `scripts/compatibility/xpath.js` for compatibility.");
      }
      one2edit.net.Loader.load(_getFile("scripts/compatibility/xpath.js"));
    }
    if (one2edit.isDebug(one2edit.DEBUG_FLAG)) {
      console.groupEnd();
    }
    if (_options.autoCreate) {
      one2edit.create();
    }
  }
  one2edit.ready(_prepare);
})();
