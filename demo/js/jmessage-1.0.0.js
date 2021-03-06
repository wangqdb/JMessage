/*
*  JMessage SDK VERSION-1.0.0
*/
JMessage = (function() {
	var JMessage = {};
	JMessage.version = '1.0';
	JMessage.appKey = '';
	JMessage.signature = '';
	JMessage.username;
	JMessage.password;
	JMessage.socket = '';
     JMessage.debug = true;
	JMessage.rid = 201503;
	JMessage.isInited = false;
	JMessage.isFirstLogin = true;
	JMessage.requestTimeOut = 10000;
	JMessage.url = 'http://127.0.0.1:9092';
	JMessage.httpServerUrl = 'http://127.0.0.1:9093';
	//JMessage.url = 'http://webchatserver.im.jpush.cn:3000';
	//JMessage.httpServerUrl = 'http://webchatserver.im.jpush.cn:80';
	JMessage.QiNiuMediaUrl = 'http://jpushim.qiniudn.com/';
	JMessage.UpYunVoiceMediaUrl = 'http://cvoice.b0.upaiyun.com/';
	JMessage.UpYunImageMediaUrl = 'http://cimage.b0.upaiyun.com/';
	   
	JMessage.method = {
	  	CONNECT: "connect",
		DISCONNECT: "disconnect",
		HEARTBEAT: "heartbeat",
		INFO_NOTIFICATION: "info.notification",
		CONFIG: "config",
		LOGIN: "login",
		LOGOUT: "logout",
		USERINFO_GET: "userinfo.get",
		TEXTMESSAGE_SEND: "textMessage.send",
		IMAGEMESSAGE_SEND: "imageMessage.send",
		MESSAGE_RECEIVED: "message.received",
		EVENT_RECEIVED: "event.received",
		MESSAGE_PUSH: "message.push",
		EVENT_PUSH: "event.push",
		GROUP_CREATE: "group.create",
		GROUPMEMBERS_ADD: "groupMembers.add",
		GROUPMEMBERS_REMOVE: "groupMembers.remove",
		GROUPINFO_GET: "groupInfo.get",
		GROUPINFO_UPDATE: "groupInfo.update",
		GROUP_EXIT: "group.exit",
		GROUPLIST_GET: "groupList.get"
	};
	
	JMessage.ERROR = {
	   	REQUEST_TIMEOUT: {
	   		CODE: 872006,
	   		MESSAGE: 'request timeout'
	   	},
	   	DISCONNECT_TO_IMSERVER: {
	   		CODE: 872007,
	   		MESSAGE: 'disconnect from im server'
	   	}
	};

	// JMessage Message Quene
	JMessage.MessageQuene = {
	   	// rid -> message data
	};

	JMessage.RequestToTimeoutMap = {
	   	// rid -> request timeout func mark
	};

	JMessage.CallbackDeferCache = {
	   	// rid -> callback defer
	};

	// request rid
	JMessage.getRID = function(){
		JMessage.rid ++;
		if (JMessage.rid > 999999) {
			JMessage.rid = 201503;
		}
		return JMessage.rid;
	};

	JMessage.getTrimStrValue = function(str){
		if (typeof str == 'string') {
			return str.replace(/^\s+|\s+$/g,"");
		} else {
			console.error('argument should be string');
		}
	};

	JMessage.addRequestTimeoutCallback = function(rid){
		var timeoutMark = setTimeout(function(){
	   		JMessage.CallbackDeferCache[rid].reject(JMessage.ERROR.REQUEST_TIMEOUT.CODE,
	   			JMessage.ERROR.REQUEST_TIMEOUT.MESSAGE, rid);
	   			delete JMessage.CallbackDeferCache[rid];
	   	    		delete JMessage.RequestToTimeoutMap[rid];
	   	    	}, JMessage.requestTimeOut);
		JMessage.RequestToTimeoutMap[rid] = timeoutMark;
	};

	JMessage.removeRequestTimeoutCallback = function(rid){
		clearTimeout(JMessage.RequestToTimeoutMap[rid]);
		delete JMessage.RequestToTimeoutMap[rid];
	};

	JMessage.addDeferCallback = function(rid, success, fail){
		var callbackDefer = $.Deferred();
		callbackDefer.done(success);
		callbackDefer.fail(fail);
		JMessage.CallbackDeferCache[rid] = callbackDefer;
	};

	JMessage.connect = function() {
		/*JMessage.socket = io(this.url, {
		   		'reconnection': true,
				'autoConnect': true,
				'force new connection': true,
				'reconnectionDelay': 500,
				'reconnectionDelayMax': 1000,
				'timeout': 20000,
				'max reconnection attempts': 5
		   	});*/
		if(window.WebSocket){
			JMessage.socket = io(this.url, {
				'transports': ['websocket'],
				'reconnection': true,
				'autoConnect': true,
				'force new connection': true,
				'reconnectionDelay': 500,
				'reconnectionDelayMax': 1000,
				'timeout': 20000,
				'max reconnection attempts': 5
		      });
		} else {
			JMessage.socket = io(this.url, {
		   		'reconnection': true,
				'autoConnect': true,
				'force new connection': true,
				'reconnectionDelay': 500,
				'reconnectionDelayMax': 1000,
				'timeout': 20000,
				'max reconnection attempts': 5
		   	});
		}
	};

	/* -------------------------------------- SDK 事件绑定 --------------------------------------*/
	// 网络连接
     JMessage.onConnected = function(func){
         	if(func instanceof Function){
               	JMessage.connected = func;
          	} else {
          		if (JMessage.debug) {
          			console.error('SDK Warn: JMessage.onConnected argument should be function');
          		}
          	}
     	};

     // 网络断开
     	JMessage.onDisconnected = function(func){
		if (func instanceof Function) {
			JMessage.disconnected = func;
		} else {
			if (JMessage.debug) {
				console.error('SDK Warn: JMessage.onDisconnected argument should be function');
			}
		}
	};

	JMessage.ready = function(func){
		if (func instanceof Function) {
			JMessage.ready = func;
		} else {
			if (JMessage.debug) {
				console.error('SDK Warn: JMessage.ready argument should be function');
			}
		}
	};
		
	JMessage.error = function(func){
		if (func instanceof Function) {
			JMessage.error = func;
		} else {
			if (JMessage.debug) {
				console.error('SDK Warn: JMessage.error argument should be function');
			}
		}
	};

	JMessage.notification = function(func){
		if (func instanceof Function) {
			JMessage.notification = func;
		} else {
			if (JMessage.debug) {
				console.error('SDK Warn: JMessage.notification argument should be function');
			}
		}
	};
	/* ----------------------------------------------------------------------------------------------- */

	JMessage.init = function(){
		isInited = true;
		JMessage.connect();

		JMessage.reLogin = function(){
			if(!JMessage.isFirstLogin){
				JMessage.socket.emit('data', {
					apiVersion: JMessage.version,
					id: JMessage.getRID(),
					method: JMessage.method.LOGIN,
					params: {
						signature: JMessage.signature,
						appKey: JMessage.appKey,
						username: JMessage.username,
						password: JMessage.password,
						isReLogin: 'true'
					}
				});
		   	}
	     };

		// resend message
		JMessage.resendMessage = function(options){
		  	if (!options.hasOwnProperty('rid')||!options.hasOwnProperty('success')
		   		||!options.hasOwnProperty('fail')) {
				if (JMessage.debug) {
					console.error('SDK Warn: JMessage.resendMessage info is not complete');
				}
				return;
			} else if (typeof(options.rid)!='string'||typeof(options.success)!='function'
				||typeof(options.fail)!='function'||options.success==undefined||options.fail==undefined) {
				if (JMessage.debug) {
					console.error('SDK Debug: JMessage.resendMessage info arguments type is wrong or value is empty');
				}
				return;
			} else {
				var rid = options.rid;
			   	var message = JMessage.MessageQuene[rid];
			   	JMessage.socket.emit('data', message);
			   	JMessage.addDeferCallback(rid, options.success, options.fail);
			   	JMessage.addRequestTimeoutCallback(rid);
			}
		};
		
		/* -------------------------------  定义上行业务事件 -----------------------------*/
		
		// 应用配置
		JMessage.config = function(options){
			if(options.hasOwnProperty('debug')&&typeof(options.debug) == 'boolean'){
				JMessage.debug = options.debug;
			}
			if (options.hasOwnProperty('debug')&&typeof(options.debug) != 'boolean') {
				console.error('SDK Warn: JMessage.config argument debug should be boolean');
				return;
			};
			if (!options.hasOwnProperty('appKey')||!options.hasOwnProperty('timestamp')
				||!options.hasOwnProperty('randomStr')||!options.hasOwnProperty('signature')) {
				console.error('SDK Warn: JMessage.config info is not complete');
				return;
			} else if(typeof(options.appKey)!='string'||typeof(options.timestamp)!='string'
				||typeof(options.randomStr)!='string'||typeof(options.signature)!='string'
				||options.timestamp.replace(/^\s+|\s+$/g,"")==''||options.timestamp.replace(/^\s+|\s+$/g,"")==''
				||options.randomStr.replace(/^\s+|\s+$/g,"")==''||options.signature.replace(/^\s+|\s+$/g,"")==''){
				console.error('SDK Debug: JMessage.config info arguments type is wrong or value is empty');
				return;
			} else { 
				JMessage.appKey = options.appKey;
				JMessage.signature = JMessage.getTrimStrValue(options.signature);
				var _timestamp = JMessage.getTrimStrValue(options.timestamp);
				var _randomStr = JMessage.getTrimStrValue(options.randomStr);
				var _signature = JMessage.getTrimStrValue(options.signature);
				var rid = JMessage.getRID();
				var callbackDefer = $.Deferred();
				callbackDefer.fail(JMessage.error);
				JMessage.CallbackDeferCache[rid] = callbackDefer;
				if (JMessage.debug) {
					console.info('JMessage.config -- timestamp -- ' + _timestamp);
					console.info('JMessage.config -- randomStr -- ' + _randomStr);
					console.info('JMessage.config -- signature -- ' + _signature);
				}
				JMessage.socket.emit('data', {
					apiVersion: JMessage.version,
					id: rid,
					method: JMessage.method.CONFIG,
					params: {
						appKey: JMessage.getTrimStrValue(options.appKey),
						timestamp: _timestamp,
						randomStr: _randomStr,
						signature: _signature
					}
				});
				JMessage.addRequestTimeoutCallback(rid);
			}
		};

		// 用户登陆
		JMessage.login = function(options){
			if (!options.hasOwnProperty('username')||!options.hasOwnProperty('password')
				||!options.hasOwnProperty('success')||!options.hasOwnProperty('fail')) { 
				if (JMessage.debug) {
					console.error('SDK Warn: JMessage.login info is not complete');
				}
				return;
			} else if (typeof(options.username)!='string'||typeof(options.password)!='string'
				||typeof(options.success)!='function'||typeof(options.fail)!='function'
				||options.username.replace(/^\s+|\s+$/g,"")==''||options.password.replace(/^\s+|\s+$/g,"")==''
				||options.success==undefined||options.fail==undefined) {
				if (JMessage.debug) {
					console.error('SDK Debug: JMessage.login info arguments type is wrong or value is empty');
				}
				return;
			} else {
				JMessage.username = JMessage.getTrimStrValue(options.username);
				JMessage.password = JMessage.getTrimStrValue(options.password);
				var rid = JMessage.getRID();
				JMessage.loginSuccess = options.success;
				JMessage.loginFail = options.fail;
				JMessage.addDeferCallback(rid, options.success, options.fail);
				if(JMessage.debug){
					console.info('JMessage.login -- username -- '+ JMessage.username);
					console.info('JMessage.login -- password -- '+ JMessage.password);
					console.info('JMessage.login -- success callback -- '+ options.success);
					console.info('JMessage.login -- fail callback -- '+ options.fail);
				}
				JMessage.socket.emit('data', {
					apiVersion: JMessage.version,
					id: rid,
					method: JMessage.method.LOGIN,
					params: {
						signature: JMessage.signature,
						appKey: JMessage.appKey,
						username: JMessage.username,
						password: JMessage.password,
						isReLogin: 'false'
					}
				});
				JMessage.isFirstLogin = false;
				var _timeoutMark = setTimeout(function(){
		   	    		JMessage.CallbackDeferCache[rid].reject(JMessage.ERROR.REQUEST_TIMEOUT.CODE,
		   	    			JMessage.ERROR.REQUEST_TIMEOUT.MESSAGE, rid);
		   	    		delete JMessage.CallbackDeferCache[rid];
		   	    		delete JMessage.RequestToTimeoutMap[rid];
		   	    	}, 60000);
				JMessage.RequestToTimeoutMap[rid] = _timeoutMark;
				//JMessage.addRequestTimeoutCallback(rid);
			}
		};
		
		// 用户登出
		JMessage.logout = function(){
			JMessage.socket.emit('data', {
				apiVersion: JMessage.version,
				id: JMessage.getRID(),
				method: JMessage.method.LOGOUT,
				params: {}
			});
		};
		
		// 获取用户信息
		JMessage.getUserInfo = function(options){
			if (!options.hasOwnProperty('username')||!options.hasOwnProperty('success')
				||!options.hasOwnProperty('fail')) {
				if (JMessage.debug) {
					console.error('SDK Warn: JMessage.getUserInfo info is not complete');
				}
				return;
			} else if (typeof(options.username)!='string'||typeof(options.success)!='function'
				||typeof(options.fail)!='function'||options.username.replace(/^\s+|\s+$/g,"")==''
				||options.success==undefined||options.fail==undefined) {
				if (JMessage.debug) {
					console.error('SDK Debug: JMessage.getUserInfo info arguments type is wrong or value is empty');
				}
				return;
			} else {
				var _username = JMessage.getTrimStrValue(options.username);
				var rid = JMessage.getRID();
				JMessage.addDeferCallback(rid, options.success, options.fail);
				if(JMessage.debug){
					console.info('JMessage.getUserInfo -- username -- ' + _username);
					console.info('JMessage.getUserInfo -- success callback -- ' + options.success);
					console.info('JMessage.getUserInfo -- fail callback -- ' + options.fail);
				}
				JMessage.socket.emit('data', {
					apiVersion: JMessage.version,
					id: rid,
					method: JMessage.method.USERINFO_GET,
					params: {
						signature: JMessage.signature,
						username: _username
					}
				});
				JMessage.addRequestTimeoutCallback(rid);
			}
		};
		
		// 发送文本消息
		JMessage.sendTextMessage = function(options){
			if (!options.hasOwnProperty('targetId')||!options.hasOwnProperty('targetType')
				||!options.hasOwnProperty('text')||!options.hasOwnProperty('success')
				||!options.hasOwnProperty('fail')) {
				if (JMessage.debug) {
					console.error('SDK Warn: JMessage.sendTextMessage info is not complete');
				}
				return;
			} else if (typeof(options.targetId)!='string'||typeof(options.targetType)!='string'
				||typeof(options.text)!='string'||typeof(options.success)!='function'
				||typeof(options.fail)!='function'||options.targetId.replace(/^\s+|\s+$/g,"")==''
				||options.targetType.replace(/^\s+|\s+$/g,"")==''
				||options.success==undefined||options.fail==undefined) {
				if (JMessage.debug) {
					console.error('SDK Debug: JMessage.sendTextMessage info arguments type is wrong or value is empty');
				}
				return;
			} else {
				if(options.hasOwnProperty('idGenerated')&&typeof(options.idGenerated)=='function'){
					JMessage.returnGenerateRid = options.idGenerated;
				}
				var _targetId = JMessage.getTrimStrValue(options.targetId);
				var _targetType = JMessage.getTrimStrValue(options.targetType);
				var _text = options.text;
				var rid = JMessage.getRID();
				JMessage.returnGenerateRid(rid);
				JMessage.addDeferCallback(rid, options.success, options.fail);
				if(JMessage.debug){
					console.info('JMessage.sendTextMessage -- targetId -- ' + _targetId);
					console.info('JMessage.sendTextMessage -- targetType -- ' + _targetType);
					console.info('JMessage.sendTextMessage -- text -- ' + _text);
					console.info('JMessage.sendTextMessage -- success callback -- '+options.success);
					console.info('JMessage.sendTextMessage -- fail callback -- '+options.fail);
				}
				var message = {
								apiVersion: JMessage.version,
								id: rid,
								method: JMessage.method.TEXTMESSAGE_SEND,
								params: {
									signature: JMessage.signature,
									targetId: _targetId,
									targetType: _targetType,
									text: _text
								}
							};
				JMessage.socket.emit('data', message);
				JMessage.MessageQuene[rid] = message;
				JMessage.addRequestTimeoutCallback(rid);
			}
		};
		
           // 发送图片消息
           JMessage.sendImageMessage = function(options){
			if (!options.hasOwnProperty('targetId')||!options.hasOwnProperty('targetType')
				||!options.hasOwnProperty('fileId')||!options.hasOwnProperty('success')
				||!options.hasOwnProperty('fail')) {
				if (JMessage.debug) {
					console.error('SDK Warn: JMessage.sendImageMessage info is not complete');
				}
				return;
			} else if (options.targetId==undefined||typeof(options.targetType)!='string'
				||typeof(options.fileId)!='string'||typeof(options.success)!='function'
				||typeof(options.fail)!='function'||options.targetType.replace(/^\s+|\s+$/g,"")==''
				||options.fileId.replace(/^\s+|\s+$/g,"")==''
				||options.success==undefined||options.fail==undefined) {
				if (JMessage.debug) {
					console.error('SDK Debug: JMessage.sendImageMessage info arguments type is wrong or value is empty');
				}
				return;
			} else {
				if(options.hasOwnProperty('idGenerated')&&typeof(options.idGenerated)=='function'){
					JMessage.returnGenerateRid = options.idGenerated;
				}
				var _targetId;
				if(typeof(options.targetId)=='string'){
					if(options.targetId.replace(/^\s+|\s+$/g,"")==''){
						if (JMessage.debug) {
							console.error('SDK Debug: JMessage.sendImageMessage targetId is empty');
						}
						return;
					} else {
						_targetId = JMessage.getTrimStrValue(options.targetId);
					}
				} else {
					_targetId = options.targetId;
				}
	                var fileMark = JMessage.appKey+new Date().getTime();
				var _targetType = JMessage.getTrimStrValue(options.targetType); 
				var rid = JMessage.getRID();
				JMessage.returnGenerateRid(rid);
	                JMessage.addDeferCallback(rid, options.success, options.fail);
	                if(JMessage.debug){
					console.info('JMessage.sendImageMessage -- targetId -- ' + _targetId);
					console.info('JMessage.sendImageMessage -- targetType -- ' + _targetType);
					console.info('JMessage.sendImageMessage -- fileId -- ' + fileMark);
					console.info('JMessage.sendImageMessage -- success callback -- '+ options.success);
					console.info('JMessage.sendImageMessage -- fail callback -- '+ options.fail);
				}
	                var count = 0;
	                $.ajaxFileUpload({
			           url: JMessage.httpServerUrl,
			           method: 'post',
		                fileElementId: options.fileId.replace(/^\s+|\s+$/g,""),
	                     dataType: 'json',                             
	                     data: {fileId: fileMark},
		                success: function (resp){
		                },
		                error: function (data, status, e){
	                        count++;
	                        if(count==2){
	                        	var message = {
				                            	apiVersion: JMessage.version,
										id: rid,
										method: JMessage.method.IMAGEMESSAGE_SEND,
										params: {
											signature: JMessage.signature,
											targetId: _targetId,
				                                	targetType: _targetType,
				                                	fileId: fileMark
										}
				                            };
	                           JMessage.socket.emit('data', message);
	                           var timeoutMark = setTimeout(function(){
			   	    			JMessage.CallbackDeferCache[rid].reject(JMessage.ERROR.REQUEST_TIMEOUT.CODE, 
			   	    				JMessage.ERROR.REQUEST_TIMEOUT.MESSAGE, rid);
			   	    			delete JMessage.RequestToTimeoutMap[rid];
	   	    					delete JMessage.CallbackDeferCache[rid];
			   	    		}, JMessage.requestTimeOut);
	                           JMessage.RequestToTimeoutMap[rid] = timeoutMark;
	                        }
	                    }
	                });
            	}
		};

		// 创建群
		JMessage.createGroup = function(options){
			if (!options.hasOwnProperty('groupName')||!options.hasOwnProperty('groupDescription')
				||!options.hasOwnProperty('success')||!options.hasOwnProperty('fail')) {
				if (JMessage.debug) {
					console.error('SDK Warn: JMessage.createGroup info is not complete');
				}
				return;
			} else if (typeof(options.groupName)!='string'||typeof(options.groupDescription)!='string'
				||typeof(options.success)!='function'||typeof(options.fail)!='function'
				||options.groupName.replace(/^\s+|\s+$/g,"")==''||options.groupDescription.replace(/^\s+|\s+$/g,"")==''
				||options.success==undefined||options.fail==undefined) {
				if (JMessage.debug) {
					console.error('SDK Debug: JMessage.createGroup info arguments type is wrong or value is empty');
				}
				return;
			} else {
				var _groupName = JMessage.getTrimStrValue(options.groupName);
				var _groupDescription = JMessage.getTrimStrValue(options.groupDescription);
				var rid = JMessage.getRID();
				JMessage.addDeferCallback(rid, options.success, options.fail);
				if (JMessage.debug) {
					console.info('JMessage.createGroup -- groupName -- ' + _groupName);
					console.info('JMessage.createGroup -- groupDescription -- ' + _groupDescription);
					console.info('JMessage.createGroup -- success callback -- '+ options.success);
					console.info('JMessage.createGroup -- fail callback -- '+ options.fail);
				}
				JMessage.socket.emit('data', {
					apiVersion: JMessage.version,
					id: rid,
					method: JMessage.method.GROUP_CREATE,
					params: {
						signature: JMessage.signature,
						groupName: _groupName,
						groupDescription: _groupDescription
					}
				});
				JMessage.addRequestTimeoutCallback(rid);
			}
		};
		
		// 获取群信息
		JMessage.getGroupInfo = function(options){
			if (!options.hasOwnProperty('groupId')||!options.hasOwnProperty('success')
				||!options.hasOwnProperty('fail')) {
				if (JMessage.debug) {
					console.error('SDK Warn: JMessage.getGroupInfo info is not complete');
				}
				return;
			} else if (typeof(options.groupId)!='number'||typeof(options.success)!='function'
				||typeof(options.fail)!='function'||options.groupId==0
				||options.success==undefined||options.fail==undefined) {
				if (JMessage.debug) {
					console.error('SDK Debug: JMessage.getGroupInfo info arguments type is wrong or value is empty');
				}
				return;
			} else {
				var _groupId = options.groupId;
				var rid = JMessage.getRID();
				JMessage.addDeferCallback(rid, options.success, options.fail);
				if (JMessage.debug) {
					console.info('JMessage.getGroupInfo -- groupId -- ' + _groupId);
					console.info('JMessage.getGroupInfo -- success callback -- ' + options.success);
					console.info('JMessage.getGroupInfo -- fail callback -- ' + options.fail);
				}
				JMessage.socket.emit('data', {
					apiVersion: JMessage.version,
					id: rid,
					method: JMessage.method.GROUPINFO_GET,
					params: {
						signature: JMessage.signature,
						groupId: _groupId
					}
				});
				JMessage.addRequestTimeoutCallback(rid);
			}
		};
		
		// 添加群成员
		JMessage.addGroupMembers = function(options){
			if (!options.hasOwnProperty('groupId')||!options.hasOwnProperty('memberUsernames')
				||!options.hasOwnProperty('success')||!options.hasOwnProperty('fail')) {
				if (JMessage.debug) {
					console.error('SDK Warn: JMessage.addGroupMembers info is not complete');
				}
				return;
			} else if (typeof(options.groupId)!='number'||!(options.memberUsernames instanceof Array)
				||typeof(options.success)!='function'||typeof(options.fail)!='function'
				||options.groupId==0||options.memberUsernames.length==0
				||options.success==undefined||options.fail==undefined) {
				if (JMessage.debug) {
					console.error('SDK Debug: JMessage.addGroupMembers info arguments type is wrong or value is empty');
				}
				return;
			} else {
				var _groupId = options.groupId;
				var _memberusernames = options.memberUsernames;
				var rid = JMessage.getRID();
				JMessage.addDeferCallback(rid, options.success, options.fail);
				if (JMessage.debug) {
					console.info('JMessage.addGroupMembers -- groupId -- ' + _groupId);
					console.info('JMessage.addGroupMembers -- memberUsernames -- ' + _memberusernames.join('-'));
					console.info('JMessage.addGroupMembers -- success callback -- '+ options.success);
					console.info('JMessage.addGroupMembers -- fail callback -- '+ options.fail);
				}
				JMessage.socket.emit('data', {
					apiVersion: JMessage.version,
					id: rid,
					method: JMessage.method.GROUPMEMBERS_ADD,
					params: {
						signature: JMessage.signature,
						groupId: _groupId,
						memberUsernames: _memberusernames
					}
				});
				JMessage.addRequestTimeoutCallback(rid);
			}
		};
		
		// 移除群成员
		JMessage.removeGroupMembers = function(options){
			if (!options.hasOwnProperty('groupId')||!options.hasOwnProperty('memberUsernames')
				||!options.hasOwnProperty('success')||!options.hasOwnProperty('fail')) {
				if (JMessage.debug) {
					console.error('SDK Warn: JMessage.removeGroupMembers info is not complete');
				}
				return;
			} else if (typeof(options.groupId)!='number'||!(options.memberUsernames instanceof Array)
				||typeof(options.success)!='function'||typeof(options.fail)!='function'
				||options.groupId==0||options.memberUsernames.length==0
				||options.success==undefined||options.fail==undefined) {
				if (JMessage.debug) {
					console.error('SDK Debug: JMessage.removeGroupMembers info arguments type is wrong or value is empty');
				}
				return;
			} else {
				var _groupId = options.groupId;
				var _memberusernames = options.memberUsernames;
				var rid = JMessage.getRID();
				JMessage.addDeferCallback(rid, options.success, options.fail);
				if (JMessage.debug) {
					console.info('JMessage.removeGroupMembers -- groupId -- ' + _groupId);
					console.info('JMessage.removeGroupMembers -- memberUsernames -- ' + _memberusernames.join('-'));
					console.info('JMessage.removeGroupMembers -- success callback -- '+ options.success);
					console.info('JMessage.removeGroupMembers -- fail callback -- '+ options.fail);
				}
				JMessage.socket.emit('data', {
					apiVersion: JMessage.version,
					id: rid,
					method: JMessage.method.GROUPMEMBERS_REMOVE,
					params: {
						signature: JMessage.signature,
						groupId: _groupId,
						memberUsernames: _memberusernames
					}
				});
				JMessage.addRequestTimeoutCallback(rid);
			}
		};
		
		// 退出群
		JMessage.exitGroup = function(options){
			if (!options.hasOwnProperty('groupId')||!options.hasOwnProperty('success')
				||!options.hasOwnProperty('fail')) {
				if (JMessage.debug) {
					console.error('SDK Warn: JMessage.exitGroup info is not complete');
				}
				return;
			} else if (typeof(options.groupId)!='number'||typeof(options.success)!='function'
				||typeof(options.fail)!='function'||options.groupId==0
				||options.success==undefined||options.fail==undefined) {
				if (JMessage.debug) {
					console.error('SDK Debug: JMessage.exitGroup info arguments type is wrong or value is empty');
				}
				return;
			} else {
				var _groupId = options.groupId;
				var rid = JMessage.getRID();
				JMessage.addDeferCallback(rid, options.success, options.fail);
				if (JMessage.debug) {
					console.info('JMessage.exitGroup -- groupId -- ' + _groupId);
					console.info('JMessage.exitGroup -- success callback -- '+ options.success);
					console.info('JMessage.exitGroup -- fail callback -- '+ options.fail);
				}
				JMessage.socket.emit('data', {
					apiVersion: JMessage.version,
					id: rid,
					method: JMessage.method.GROUP_EXIT,
					params: {
						signature: JMessage.signature,
						groupId: _groupId
					}
				});
				JMessage.addRequestTimeoutCallback(rid);
			}
		};
		
		// 获取群组列表
		JMessage.getGroupList = function(options){
			if (!options.hasOwnProperty('success')||!options.hasOwnProperty('fail')) {
				if (JMessage.debug) {
					console.error('SDK Warn: JMessage.getGroupList info is not complete');
				}
				return;
			} else if(typeof(options.success)!='function'||typeof(options.fail)!='function'
				||options.success==undefined||options.fail==undefined) {
				if (JMessage.debug) {
					console.error('SDK Debug: JMessage.getGroupList info arguments type is wrong or value is empty');
				}
				return;
			} else {
				var rid = JMessage.getRID();
				JMessage.addDeferCallback(rid, options.success, options.fail);
				if (JMessage.debug) {
					console.info('JMessage.getGroupList -- success callback -- '+ options.success);
					console.info('JMessage.getGroupList -- fail callback -- '+ options.fail);
				}
				JMessage.socket.emit('data', {
					apiVersion: JMessage.version,
					id: rid,
					method: JMessage.method.GROUPLIST_GET,
					params: {
						signature: JMessage.signature
					}
				});
				JMessage.addRequestTimeoutCallback(rid);
			}
		};
		
		// 更新群组信息
		JMessage.updateGroupInfo = function(options){
			if (!options.hasOwnProperty('groupId')||!options.hasOwnProperty('success')
				||!options.hasOwnProperty('fail')||(!options.hasOwnProperty('groupName')&&!options.hasOwnProperty('groupDescription'))) {
				if (JMessage.debug) {
					console.error('SDK Warn: JMessage.updateGroupInfo info is not complete');
				}
				return;
			} else {
				var _groupId = options.groupId;
				var rid = JMessage.getRID();
				JMessage.addDeferCallback(rid, options.success, options.fail);
				if (JMessage.debug) {
					console.info('JMessage.updateGroupInfo -- groupId -- ' + _groupId);
					console.info('JMessage.updateGroupInfo -- success callback -- '+ options.success);
					console.info('JMessage.updateGroupInfo -- fail callback -- '+ options.fail);
				}
				var data = {
					apiVersion: JMessage.version,
					id: rid,
					method: JMessage.method.GROUPINFO_UPDATE,
					params: {
						signature: JMessage.signature,
						groupId: _groupId
					}
				};
				if (options.hasOwnProperty('groupName')&&typeof(options.groupName)=='string') {
					data.params.groupName = JMessage.getTrimStrValue(options.groupName);
					console.info('JMessage.updateGroupInfo -- groupName -- '+data.params.groupName);
				} else {
					if(JMessage.debug){
						console.error('SDK Debug: JMessage.updateGroupInfo info groupName argument exception');
					}
				}
				if (options.hasOwnProperty('groupDescription')&&typeof(options.groupDescription)=='string') {
					data.params.groupDescription = JMessage.getTrimStrValue(options.groupDescription);
					console.info('JMessage.updateGroupInfo -- groupDescription -- '+data.params.groupDescription);
				} else {
					if(JMessage.debug){
						console.error('SDK Debug: JMessage.updateGroupInfo info groupDescription argument exception');
					}
				}
				if (options.groupName.replace(/^\s+|\s+$/g,"")==''&&options.groupDescription.replace(/^\s+|\s+$/g,"")) {
					if(JMessage.debug){
						console.error('SDK Debug: JMessage.updateGroupInfo info must have groupName or groupDescription');
					}
					return;
				}
				JMessage.socket.emit('data', data);
				JMessage.addRequestTimeoutCallback(rid);
			}
		};

		// 同步message接收
		JMessage.onMessageReceived = function(func){
			if (func instanceof Function) {
				JMessage.onMessageReceived = func;
			} else {
				if (JMessage.debug) {
					console.error('SDK Warn: JMessage.onMessageReceived argument should be function');
				}
			}
		};

		// 同步event接收
		JMessage.onEventReceived = function(func){
			if (func instanceof Function) {
				JMessage.onEventReceived = func;
			} else {
				if (JMessage.debug) {
					console.error('SDK Warn: JMessage.onEventReceived argument should be function');
				}
			}
		};

		/*---------------------------------- 定义下行业务事件 -----------------------------*/
		// 连接成功
		JMessage.socket.on('onConnected', function(){
			console.log('init success');
			if(JMessage.connected!=undefined){
	                JMessage.connected();
	           } else {
	           	if(JMessage.debug){
	            		console.error('JMessage.connected处理函数未配置');
	            	}
	           }
		});
		
		// reconnect
		JMessage.socket.on('reconnecting', function(reconnectCount){
			console.log('reconnect count: '+reconnectCount);
			/*if(reconnectCount>1){
				console.log('connect exception, please login again');
				//window.location.reload();
			}*/
			if(JMessage.debug){
				console.info('reconnecting......');
			}
		});
		
		// reconnect success
		JMessage.socket.on('reconnect', function(){
			JMessage.reLogin();
		});

		JMessage.socket.on('connect_error',function(e){
			console.log('client connect error: ',e);
		});

		// 连接断开
		JMessage.socket.on('disconnect', function(){
			//JMessage.reLogin();
			if(JMessage.disconnected!=undefined){
                	JMessage.disconnected();
            	} else {
            		if(JMessage.debug){
                		console.error('JMessage.disconnected处理函数未配置');
            		}
            	}
		});
		JMessage.socket.on('onDisconnected', function(){
			JMessage.reLogin();
			if(JMessage.disconnected!=undefined){
                	JMessage.disconnected();
            	} else {
            		if(JMessage.debug){
            			console.error('JMessage.disconnected处理函数未配置');
            		}
            	}
		});
		
		// SDK receive data 
		JMessage.socket.on('data', function(data){
			var resp = JSON.parse(data);
			var apiVersion = resp.apiVersion;
			var method = resp.method;
			var id = resp.id;
			if((!JMessage.RequestToTimeoutMap.hasOwnProperty(id))&&method!=JMessage.method.MESSAGE_PUSH
				&&method!=JMessage.method.EVENT_PUSH&&method!=JMessage.method.INFO_NOTIFICATION){  // timeout
				console.info('request: '+id+' timeout, so throw response data');
				return;
			} else {
				JMessage.removeRequestTimeoutCallback(id);
			}
			switch (method) {
				case JMessage.method.CONFIG:
					if(resp.data||resp.data===''){
						if(JMessage.ready!=undefined){
                    				JMessage.ready();
                			} else {
                				if (JMessage.debug) {
                					console.error('JMessage.ready处理函数未配置');
                				}
                			}
					} else if(resp.error) {
                			if(JMessage.error!=undefined){
				    			JMessage.error(resp.error.code, resp.error.message);
                			} else {
                				if (JMessage.debug) {
                					console.error('JMessage.error处理函数未配置');
                				}
                			}
					}
					break;
				case JMessage.method.INFO_NOTIFICATION:
					 if(resp.error) {
                			if(JMessage.notification!=undefined){
				    			JMessage.notification(resp.error.code, resp.error.message);
                			} else {
                				if (JMessage.debug) {
                					console.error('JMessage.notification处理函数未配置');
                				}
                			}
					}
					break;
				case JMessage.method.LOGIN:
					if(resp.data||resp.data===''){
						if(JMessage.CallbackDeferCache[id]){
	                			JMessage.CallbackDeferCache[id].resolve();
							delete JMessage.CallbackDeferCache[id];
						} else if (JMessage.loginSuccess!=undefined){
							JMessage.loginSuccess();
						} else {
							if(JMessage.debug){
								console.error('JMessage login success处理函数未配置');
							}
						}
					} else if(resp.error) {
	                		if(JMessage.CallbackDeferCache[id]){
					    		JMessage.CallbackDeferCache[id].reject(resp.error.code, resp.error.message);
							delete JMessage.CallbackDeferCache[id];
				    		} else if (JMessage.loginFail){
	                			JMessage.loginFail();
	                		} else {
				    			if (JMessage.debug) {
				    				console.error('JMessage login fail处理函数未配置');
				    			}
	                		}
					}
					break;
				case JMessage.method.LOGOUT:
					if(resp.data||resp.data===''){
						if (JMessage.debug) {
							console.info('user logout success');
						}
					} else if(resp.error) {
						if(JMessage.debug){
							console.error('user logout fail');
						}
					}
					break;
				case JMessage.method.USERINFO_GET:
					if(resp.data||resp.data===''){
						if(JMessage.CallbackDeferCache[id]){
							var callback = JMessage.CallbackDeferCache[id].resolve(resp.data);
							delete JMessage.CallbackDeferCache[id];
						} else {
							if (JMessage.debug) {
								console.error('JMessage getUserInfo success处理函数未配置');
							}
						}
					} else if(resp.error) {
	                		if(JMessage.CallbackDeferCache[id]){
							JMessage.CallbackDeferCache[id].reject(resp.error.code, resp.error.message);
							delete JMessage.CallbackDeferCache[id];
						} else {
							if (JMessage.debug) {
								console.error('JMessage getUserInfo fail处理函数未处理');
							}
						}
					}
					break;
				case JMessage.method.TEXTMESSAGE_SEND:
					if(resp.data||resp.data===''){
						if(JMessage.CallbackDeferCache[id]){
							var callback = JMessage.CallbackDeferCache[id].resolve(id);
							delete JMessage.CallbackDeferCache[id];
							delete JMessage.MessageQuene[id];
						} else {
							if (JMessage.debug) {
								console.error('JMessage sendMessageSuccess 处理函数未配置');
							}
						}
						if (JMessage.debug) {
							console.log('send Message success');
						}
					} else if(resp.error) {
						if(JMessage.CallbackDeferCache[id]){
							JMessage.CallbackDeferCache[id].reject(resp.error.code, resp.error.message, id);
							delete JMessage.CallbackDeferCache[id];
							if(JMessage.ERROR.DISCONNECT_TO_IMSERVER.CODE==resp.error.code){
								JMessage.reLogin();
							}
						} else {
							if (JMessage.debug) {
								console.error('JMessage sendMessageFail 处理函数未配置');
							}
						}
						if (JMessage.debug) {
							console.info('send Message failed, code:'+resp.error.code+', message:'+resp.error.message);
						}
					}
					break;
				case JMessage.method.IMAGEMESSAGE_SEND:
					if(resp.data||resp.data===''){
						if(JMessage.CallbackDeferCache[id]){
							var callback = JMessage.CallbackDeferCache[id].resolve(resp.id);
							delete JMessage.CallbackDeferCache[id];
							delete JMessage.MessageQuene[resp.id];
						} else {
							if (JMessage.debug) {
								console.error('JMessage sendMessageSuccess 处理函数未配置');
							}
						}
						if (JMessage.debug) {
							console.info('send Message success');
						}
					} else if(resp.error) {
						if(JMessage.CallbackDeferCache[id]){
							JMessage.CallbackDeferCache[id].reject(resp.error.code, resp.error.message, id);
							delete JMessage.CallbackDeferCache[id];
							if(JMessage.ERROR.DISCONNECT_TO_IMSERVER.CODE==resp.error.code){
								JMessage.reLogin();
							}
						} else {
							if (JMessage.debug) {
								console.error('JMessage sendMessageFail 处理函数未配置');
							}
						}
						if (JMessage.debug) {
							console.info('send Message failed, code:'+resp.error.code+', message:'+resp.error.message);
						}
					}
					break;
				case  JMessage.method.MESSAGE_PUSH:
					if(resp.data||resp.data===''){
	                      	data = JSON.parse(resp.data);
						var msgData = {
	                        		version: data.version,
	                        		targetType: data.targetType,
	                        		targetId: data.targetId,
	                        		targetName: data.targetName,
	                        		fromType: data.fromType,
	                        		fromId: data.fromId,
	                        		fromName: data.fromName,
	                        		createTime: data.createTime,
	                        		msgType: data.msgType,
	                        		msgBody: data.msgBody
	                      	};
	                      	JMessage.onMessageReceived(JSON.stringify(msgData));
	                      	JMessage.socket.emit('data', {
	                      		apiVersion: JMessage.version,
							id: JMessage.getRID(),
							method: JMessage.method.MESSAGE_RECEIVED,
							params: {
								messageId: data.messageId,
							  	msgType: data.iMsgType, 
							  	fromUid: data.fromUid,
							  	fromGid: data.fromGid
							}
						});
					}
					break;
				case JMessage.method.EVENT_PUSH:
					if(resp.data||resp.data===''){
						data = JSON.parse(resp.data);
	                      	var eventData = {
	                        		eventType: data.eventType,
	                        		fromUsername: data.fromUsername,
	                        		gid: data.gid,
	                        		toUsernameList: data.toUsernameList,
	                        		description: data.description
	                      	};
						JMessage.onEventReceived(JSON.stringify(eventData));
	                      	JMessage.socket.emit('data', {
	                      		apiVersion: JMessage.version,
							id: JMessage.getRID(),
							method: JMessage.method.EVENT_RECEIVED,
							params: {
								eventId: data.eventId,
							  	eventType: data.iEventType, 
							  	fromUid: data.fromUid,
							  	gid: data.gid
							}
						  });
					} 
					break;
				case JMessage.method.GROUP_CREATE:
					if(resp.data||resp.data===''){
						if(JMessage.CallbackDeferCache[id]){
							var callback = JMessage.CallbackDeferCache[id].resolve(resp.data);
							delete JMessage.CallbackDeferCache[id];
						} else {
							if(JMessage.debug){
								console.error('JMessage createGroup success处理函数未配置');
							}
						}
					} else if(resp.error) {
	                		if(JMessage.CallbackDeferCache[id]){
							JMessage.CallbackDeferCache[id].reject(resp.error.code, resp.error.message);
							delete JMessage.CallbackDeferCache[id];
							if(JMessage.ERROR.DISCONNECT_TO_IMSERVER.CODE==resp.error.code){
								JMessage.reLogin();
							}
						} else {
							if(JMessage.debug){
								console.error('JMessage createGroup fail处理函数未配置');
							}
						}
					}
					break;
				case JMessage.method.GROUPMEMBERS_ADD:
					if(resp.data||resp.data===''){
						if(JMessage.CallbackDeferCache[id]){
							var callback = JMessage.CallbackDeferCache[id].resolve();
							delete JMessage.CallbackDeferCache[id];
						} else {
							if(JMessage.debug){
								console.error('JMessage addGroupMembers success处理函数未配置');
							}
						}
					} else if(resp.error) {
	                		if(JMessage.CallbackDeferCache[id]){
							JMessage.CallbackDeferCache[id].reject(resp.error.code, resp.error.message);
							delete JMessage.CallbackDeferCache[id];
							if(JMessage.ERROR.DISCONNECT_TO_IMSERVER.CODE==resp.error.code){
								JMessage.reLogin();
							}
						} else {
							if(JMessage.debug){
								console.error('JMessage addGroupMembers fail处理函数未配置');
							}
						}
					}
					break;
				case JMessage.method.GROUPMEMBERS_REMOVE:
					if(resp.data||resp.data===''){
						if(JMessage.CallbackDeferCache[id]){
	 	               			var callback = JMessage.CallbackDeferCache[id].resolve();
							delete JMessage.CallbackDeferCache[id];
						} else {
							if(JMessage.debug){
								console.error('JMessage removeGroupMembers success处理函数未配置');
							}
						}
					} else if(resp.error) {
	                		if(JMessage.CallbackDeferCache[id]){
							JMessage.CallbackDeferCache[id].reject(resp.error.code, resp.error.message);
							delete JMessage.CallbackDeferCache[id];
							if(JMessage.ERROR.DISCONNECT_TO_IMSERVER.CODE==resp.error.code){
								JMessage.reLogin();
							}
						} else {
							if (JMessage.debug) {
								console.error('JMessage removeGroupMembers fail处理函数未配置');
							}
						}
					}
					break;
				case JMessage.method.GROUPINFO_GET:
					if(resp.data||resp.data===''){
						if(JMessage.CallbackDeferCache[id]){
							var callback = JMessage.CallbackDeferCache[id].resolve(resp.data);
							delete JMessage.CallbackDeferCache[id];
						} else {
							if (JMessage.debug) {
								console.error('JMessage getGroupInfo success处理函数未配置');
							}
						}
					} else if(resp.error) {
	                		if(JMessage.CallbackDeferCache[id]){
							JMessage.CallbackDeferCache[id].reject(resp.error.code, resp.error.message);
							delete JMessage.CallbackDeferCache[id];
						} else {
							if (JMessage.debug) {
								console.error('JMessage getGroupInfo fail处理函数未配置');
							}
						}	
					}
					break;
				case JMessage.method.GROUPINFO_UPDATE:
					if(resp.data||resp.data===''){
						if(JMessage.CallbackDeferCache[id]){
							var callback = JMessage.CallbackDeferCache[id].resolve(resp.data);
							delete JMessage.CallbackDeferCache[id];
						} else {
							if (JMessage.debug) {
								console.error('JMessage updateGroupInfo success处理函数未配置');
							}			
						}
					} else if(resp.error) {
	                		if(JMessage.CallbackDeferCache[id]){
							JMessage.CallbackDeferCache[id].reject(resp.error.code, resp.error.message);
							delete JMessage.CallbackDeferCache[id];
						} else {
							if (JMessage.debug) {
								console.error('JMessage updateGroupInfo fail处理函数未配置');
							}
						}
					}
					break;
				case JMessage.method.GROUP_EXIT:
					if(resp.data||resp.data===''){
						if(JMessage.CallbackDeferCache[id]){
							var callback = JMessage.CallbackDeferCache[id].resolve();
							delete JMessage.CallbackDeferCache[id];
						} else {
							if (JMessage.debug) {
								console.error('JMessage exitGroup success处理函数未配置');
							}
						}
					} else if(resp.error) {
	                		if(JMessage.CallbackDeferCache[id]){
							JMessage.CallbackDeferCache[id].reject(resp.error.code, resp.error.message);
							delete JMessage.CallbackDeferCache[id];
						} else {
							if (JMessage.debug) {
								console.error('JMessage exitGroup fail处理函数未配置');
							}
						}
					}
					break;
				case JMessage.method.GROUPLIST_GET:
					if(resp.data||resp.data===''){
						if(JMessage.CallbackDeferCache[id]){
							var callback = JMessage.CallbackDeferCache[id].resolve(resp.data);
							delete JMessage.CallbackDeferCache[id];
						} else {
							if (JMessage.debug) {
								console.error('JMessage getGroupList success处理函数未配置');
							}
						}
					} else if(resp.error) {
	                		if(JMessage.CallbackDeferCache[id]){
							JMessage.CallbackDeferCache[id].reject(resp.error.code, resp.error.message);
							delete JMessage.CallbackDeferCache[id];
						} else {
							if (JMessage.debug) {
								console.error('JMessage getGroupList fail处理函数未配置');	
							}			
						}
					}
					break;
				default:
					console.log('undefined event');
			} // end of switch
		});
	};
	return JMessage;
})();