
/*---  JMessage Define  -----*/

var empFn = function(){};

//   运行环境检测
if(typeof jQuery == 'undefined'){
	alert('the runtime javascript environment need JQuery lib');
} 

JMessage = (function() {
		var JMessage = {};
		JMessage.ClientInfo = {
			sid : '',
			juid : '',
			uid : ''
		};
	   JMessage.url = 'http://127.0.0.1:9092';
		//JMessage.url = 'http://webchatserver.im.jpush.cn:9092';
	   JMessage.QiNiuMediaUrl = 'http://jpushim.qiniudn.com/';  // media file storage
	   JMessage.UpYunVoiceMediaUrl = 'http://cvoice.b0.upaiyun.com/';
	   JMessage.UpYunImageMediaUrl = 'http://cimage.b0.upaiyun.com/'; // http://cimage.b0.upaiyun.com/upyun/image/8F749B2597A5D412
	  
	   JMessage.MsgSequence = 0; // 消息计数器
	   JMessage.MsgQuene = {};   // 消息队列，保存未发送成功的消息
	   
	   JMessage.connect = function() {
		   if(window.WebSocket){  // 根据浏览器的支持情况选择连接方式
			  this.socket = io.connect(this.url, {
				  'transports': ['websocket']
		        });
		   } else {
		   	this.socket = io.connect(this.url, {
		   		'transports': ['polling']
		   		});
		    }
		};
	   
	  JMessage.init = function(options) {
		  this.appKey = options.appKey;
		  this.secrect = options.secrect;
		   //  处理事件响应
		  this.socket.on('connectEvent', function(){
			  options.onConnect();
		   });
		  this.socket.on('loginEventGetSJ', function(data){
			  //options.onLoginGetSJ(data);
			  console.log('JMessage内部处理登陆响应SJ！');
				if(data!=null){
					JMessage.ClientInfo.sid = data.sid;
					JMessage.ClientInfo.juid = data.juid;
				} else {
					console.log('JMessage内部处理登陆响应SJ异常');
				}
		  });
		  this.socket.on('loginEvent', function(data){
			  options.onLoginEvent(data);
		  });
		  this.socket.on('bindSocketIoClientEvent', function(data){
			  options.onBindSocketIoClientEvent(data);
		  });
		  this.socket.on('getUploadToken', function(data){
			  options.onGetUploadToken(data);
		  });
		  this.socket.on('getUploadPicMetaInfo', function(data){
			 options.onGetUploadPicMetaInfo(data); 
		  });
		  this.socket.on('getContracterList', function(data){
			  options.onGetContracterList(data);
		  });
		  this.socket.on('getGroupsList', function(data){
			  options.onGetGroupsList(data);
		  });
		  this.socket.on('getGroupMemberList', function(data){
			  options.onGetGroupMemberList(data);
		  });
		  this.socket.on('chatEvent', function(data){
			  options.onChatEvent(data);
			  emojify.run();
		  });
		  this.socket.on('msgFeedBackEvent', function(data){
			  options.onMsgFeedBackEvent(data);
		  });
		  this.socket.on('msgSyncEvent', function(data){
			  options.onMsgSyncEvent(data);
			  emojify.run();
		  });
		  this.socket.on('createGroupCmd', function(data){
			  options.onCreateGroupCmd(data);
		  });
		  this.socket.on('exitGroupCmd', function(data){
			  options.onExitGroupCmd(data);
		  });
		  this.socket.on('addFriendCmd', function(data){
			  options.onAddFriendCmd(data);
		  });
		  this.socket.on('updateGroupInfoEventNotification', function(data){
			  options.onUpdateGroupInfoEventNotification(data);
		  });
		  this.socket.on('eventNotification', function(data){
			  options.onEventNotification(data);
		  });
		  this.socket.on('logout', function(data){
			 options.onLogout(data); 
		  });
		  this.socket.on('disconnect', function(data){
			  options.onDisConnect(data);
		  });
		  //  异常处理
		  this.socket.on('IMException', options.onIMException || IMDefaultExceptionTrack);
	   };
	    
	   //  JMessage Code定义
		JMessage.Exception = {
				'USERNAME_UNEXIST' : 801003,
				'USERNAME_PASSWORD_WRONG' : 801004,
				'USERNAME_WRONG' : 802002,
				'GROUPMEMBER_UNEXIST' : 810005,
				'USER_ALREADY_IN_GROUP' : 810007,
				'APPKEY_INVALID' : 872001,
				'USERNAME_NOT_REGISTER' : 872002,
				'PASSWORD_WRONG' : 872003,
				'APPKEY_USERNAME_NOT_FIT' : 872004,
				'SEND_MSG_FAILTURE' : 872005,
				'ADD_GROUP_MEMBER_FAILTURE' : 872006,
				'DEL_GROUP_MEMBER_FAILTURE' : 872007,
				'GROUP_NAME_NULL' : 808001,
				'NO_PERMISSION_CREATE_GROUP' : 808002,
				'USER_CREATE_GROUP_TOOMUCH' : 808003,
				'GROUP_NAME_TOO_LONG' : 808004,
				'GROUP_DESC_TOO_LONG' : 808005
		};
		//   JMessage 异常处理
		var IMDefaultExceptionTrack = function(code){
		   switch(code){
		   	case JMessage.Exception.USERNAME_UNEXIST:
		   		alert('用户名不存在');
		   		location.reload();
		   		break;
		   	case JMessage.Exception.USERNAME_PASSWORD_WRONG:
		   		alert('密码与用户名不匹配');
		   		location.reload();
		   		break;
		   	case JMessage.Exception.USERNAME_WRONG:
		   		alert('用户名错误');
		   		location.reload();
		   		break;
		   	case JMessage.Exception.GROUPMEMBER_UNEXIST:
		   		alert('添加到群组的成员不存在');
		   		break;
		   	case JMessage.Exception.USER_ALREADY_IN_GROUP:
		   		alert('该用户已是群成员');
		   		break;
		   	case JMessage.Exception.APPKEY_INVALID:
		  			alert('AppKey无效'); // push
		  			break;
		   	case JMessage.Exception.USERNAME_NOT_REGISTER:
		   		alert('用户名未注册'); // im login 1
		   		break;
		   	case JMessage.Exception.PASSWORD_WRONG:
		   		alert('密码错误');  //  im login 2
		   		break;
		   	case JMessage.Exception.APPKEY_USERNAME_NOT_FIT:
		   		alert('AppKey与用户名不匹配');  // im login 3
		   		break;
		   	case JMessage.Exception.SEND_MSG_FAILTURE:
		   		alert('发送消息失败');  // im msg 
		   		break;
		   	case JMessage.Exception.ADD_GROUP_MEMBER_FAILTURE:
		   		alert('添加群组成员失败');  // im add group member
		   		break;
		   	case JMessage.Exception.DEL_GROUP_MEMBER_FAILTURE:
		   		alert('删除群组成员失败');  // im rm group member 
		   		break;
		   	case JMessage.Exception.GROUP_NAME_NULL:
		   		alert('群组名称为空');
		   		break;
		   	case JMessage.Exception.NO_PERMISSION_CREATE_GROUP:
		   		alert('没有创建群组权限');
		   		break;
		   	case JMessage.Exception.USER_CREATE_GROUP_TOOMUCH:
		   		alert('创建群组过多');
		   		break;
		   	case JMessage.Exception.GROUP_NAME_TOO_LONG:
		   		alert('群组名称太长');
		   		break;
		   	case JMessage.Exception.GROUP_DESC_TOO_LONG:
		   		alert('群组描述太长');
		   		break;
		   	default:
		   		alert('JMessage 异常');
		   		break;
			   }
		 };
	 
		// 生成rid
		JMessage.getRID = function(){  
		   var num="";
		   for(var i=0; i<6; i++){
			   num+=Math.floor(Math.random()*9 + 1);
		   	}
		   return num;
		};
		
	    //  定义业务事件
	   JMessage.sendLoginEvent = function(options) {
		   var rid = JMessage.getRID();
		   this.socket.emit('loginEvent', {
			   appKey: this.appKey,
			   rid : options.rid || rid,
	         userName: options.userName,
	         password: options.password
	        }); // 连接成功后触发登陆
	    };
	   JMessage.getUploadTokenEvent = function(options) {
		   this.socket.emit('getUploadToken');
	    };
	   JMessage.getUploadPicMetaInfo = function(src) {
	    	this.socket.emit('getUploadPicMetaInfo', src);
	    };
	   JMessage.bindSocketIoClientEvent = function(options) {
		   this.socket.emit('bindSocketIoClientEvent', {
			   user_name: options.user_name,
			   uid: options.uid
		    });
		};
	   JMessage.getContracterListEvent = function(options) {
		   this.socket.emit('getContracterList', {
			   appKey: this.appKey, 
			   user_name: options.userName,
			   uid: JMessage.ClientInfo.uid
	        });
	    };
	   JMessage.getGroupListEvent = function(options) {
		   this.socket.emit('getGroupsList', {
			   appKey: this.appKey,
			   uid: JMessage.ClientInfo.uid
	        });
	    };
	   JMessage.getGroupMemberListEvent = function(options){
		   this.socket.emit('getGroupMemberList', {
			   appKey: this.appKey,
			   uid: JMessage.ClientInfo.uid,
			   gid: options.gid
		   });
	    };
	   JMessage.updateGroupNameEvent = function(options){
		   var rid = JMessage.getRID();
		   this.socket.emit('updateGroupName', {
			   appKey: this.appKey,
				sid : JMessage.ClientInfo.sid,
				juid : JMessage.ClientInfo.juid,
				uid : JMessage.ClientInfo.uid,
				rid : options.rid || rid,
				user_name : options.user_name,
				gid : options.gid,
				group_name : options.group_name
		   });
	    };
	   JMessage.addGroupMemberEvent = function(options){
		   var rid = JMessage.getRID();
		   this.socket.emit('addGroupMember', {
			   appKey: this.appKey,
			   sid : JMessage.ClientInfo.sid,
				juid : JMessage.ClientInfo.juid,
				uid : JMessage.ClientInfo.uid,
				gid : options.gid,
				rid : options.rid || rid,
				member_count : options.member_count,
				username : options.username
		   });
	    };
	   JMessage.delGroupMemberEvent = function(options){
		   var rid = JMessage.getRID();
		   this.socket.emit('delGroupMember', {
			   appKey: this.appKey,
			   sid: JMessage.ClientInfo.sid,
				juid: JMessage.ClientInfo.juid,
				uid: JMessage.ClientInfo.uid,
				toUid : options.toUid,
				gid : options.gid,
				rid : options.rid || rid,
				member_count : options.member_count
		   });
		};
	   JMessage.chatEvent = function(options) {
		   this.socket.emit('chatEvent', options);
		   emojify.run();
	    };
	   JMessage.chatMsgSyncResp = function(options){
		   var rid = JMessage.getRID();
		   this.socket.emit('chatMsgSyncResp', {
			   appKey: this.appKey,
			   uid : JMessage.ClientInfo.uid,
			   juid : JMessage.ClientInfo.juid,
				sid : JMessage.ClientInfo.sid,
				rid : rid,
				messageId : options.messageId,
				iMsgType : options.iMsgType,
				from_uid : options.from_uid,
				from_gid : options.from_gid
		   });
		};
		JMessage.eventSyncResp = function(options){
			var rid = JMessage.getRID();
			this.socket.emit('eventSyncResp', {
				appKey: this.appKey,
				uid : JMessage.ClientInfo.uid,
				juid : JMessage.ClientInfo.juid,
				sid : JMessage.ClientInfo.sid,
				rid : rid,
				eventId : options.eventId,
				eventType : options.eventType,
				from_uid : options.from_uid,
				gid : options.gid
			});
		};
	   JMessage.addFriendCmd = function(options){
		   this.socket.emit('addFriendCmd', options);
	    };
	   JMessage.createGroupCmd = function(options){
		   var rid = JMessage.getRID();
		   this.socket.emit('createGroupCmd', {
	    		appKey: this.appKey,
	    		sid : options.sid,
				juid : options.juid,
				uid : options.uid,
				rid : options.rid || rid,
				group_name : options.group_name,
				group_desc : options.group_desc
	    	});
		};
		JMessage.exitGroupCmd = function(options){
			var rid = JMessage.getRID();
		   this.socket.emit('exitGroupCmd', {
		  		appKey: this.appKey,
		  		sid : options.sid,
				juid : options.juid,
				uid : options.uid,
				rid : options.rid || rid,
				gid : options.gid
		   	});
		};
	   JMessage.logoutEvent = function(options){
	    	this.socket.emit('logout', {
	    		appKey: this.appKey,
	    		sid : options.sid,
				juid : options.juid,
				uid : options.uid,
				user_name : options.user_name
	    	});
	    };
	   JMessage.disconnectEvent = function(options) {
		   	// to do
	    };

	    //  上传多媒体文件
	    JMessage.uploadMediaFile = function(uid, uploadToken, fileContainerId, browerButtonId,/* FilesAddedFunc,*/ UploadProgressFunc, UploadCompleteFunc){
	    	var key = getResourceId(uid);
	    	var mediaId = 'qiniu/image/'+key;
	    	//  上传图片到七牛
	    	var uploader = Qiniu.uploader({
	            runtimes: 'html5,flash,html4',    
	            browse_button: browerButtonId,            
	            uptoken : uploadToken, 
	            url: 'http://upload.qiniu.com',
	            domain: 'http://JMessage.qiniudn.com',
	            container: fileContainerId,   
	            max_file_size: '2mb',   
	            flash_swf_url: './Moxie.swf',
	            max_retries: 3,                  
	            dragdrop: true,   
	            unique_names: false, 
	            save_key: false,
	            drop_element: 'container',   
	            chunk_size: '4mb',                
	            auto_start: true,               
	            init: {
	            	'BeforeUpload': function(up, files){
	            			//  设置附带的参数
	            		/*up.setOption({
	            			'url': 'http://up.qiniu.com/',
	            			'multipart': true,
	            			'chunk_size': undefined,
	            			'headers': {
									'Authorization': 'UpToken ' + that.token
								},
	            			'multipart_params': multipart_params_obj
	            			});*/
	            		},
	            	'FilesAdded': function(up, files) {
	            		//FilesAddedFunc(files);
	            		plupload.each(files, function(file) {
         	                	
         	            	});
	            	    },
	            	'UploadProgress': function(up, file) {
	            	   UploadProgressFunc(file.percent);
	        			},
	            	'Error': function(up, err, errTip) {
	                  console.log(err);
	                	},
	               'UploadComplete': function(data) {
	            	   /*var src = JMessage.mediaUrl +"/"+ mediaId + '?imageView2/2/h/100';
	                	UploadCompleteFunc(src);*/
	            	   UploadCompleteFunc(mediaId);
	                	},
	               'Key': function(up, file) {
	            	   var key = mediaId;
	                  return key
	                	},
	               'FileUploaded': function(up, file, info) {
	                	
	                	}
	            	}
	        	});
	    };
  
	    //  定义消息内容格式
		var msgContent = {
			version:"1",
			juid:"",
			sid:"",
			target_type: "",
			target_id: "",
			target_name: "",
			from_type:"user",
			from_id: "",
			from_name: "",
			create_time: "",
			notification: {
				alert:""
			},
			msg_type: "",
			msg_body: ""
		};
		   
		//  定义 JMessage emoji 表情数据
		JMessage.emoji = {};
		JMessage.emoji.tabOne = new Array(':bowtie:',':smile:',':laughing:',':blush:',':smiley:',':relaxed:',
				':smirk:',':purple_heart:',':heart:',':green_heart:',':broken_heart:',
				':heartbeat:',':heartpulse:',':two_hearts:',':revolving_hearts:',':cupid:',
				':sparkling_heart:',':sparkles:', ':ribbon:', ':tophat:' ,':crown:' ,':womans_hat:',
				':mans_shoe:', ':closed_umbrella:', ':briefcase:', ':handbag:', ':pouch:', ':purse:', ':eyeglasses:',
				':fishing_pole_and_fish:', ':coffee:', ':tea:', ':sake:', ':baby_bottle:', ':beer:', 
				':beers:', ':cocktail:', ':tropical_drink:' ,':wine_glass:' ,':fork_and_knife:'
		);
		JMessage.emoji.tabTwo = new Array(':arrow_double_down:', ':arrow_double_up:', ':arrow_down_small:', ':arrow_heading_down:', 
				':arrow_heading_up:', ':leftwards_arrow_with_hook:', ':arrow_right_hook:', ':left_right_arrow:',
				':arrow_up_down:', ':arrow_up_small:', ':arrows_clockwise:', ':arrows_counterclockwise:',
				':rewind:', ':fast_forward:', ':information_source:', ':ok:', ':twisted_rightwards_arrows:', 
				':repeat:', ':repeat_one:', ':new:', ':top:', ':up:', ':cool:', ':free:', ':ng:', ':cinema:', ':koko:'
		);
		
		// emoji 相关配置  
		emojify.setConfig({
		    emojify_tag_type : 'img',         
		    only_crawl_id    : null,            
		    img_dir          : './res/img/emoji',  // emoji 图片存放位置
		    ignored_tags     : {               
		        'SCRIPT'  : 1,
		        'TEXTAREA': 1,
		        'A'       : 1,
		        'PRE'     : 1,
		        'CODE'    : 1
		    }
		});
		
		JMessage.initEmojiPanelOne = function(divId){
			//设置基本表情的面板数据
			for (var i=0; i<JMessage.emoji.tabOne.length; i++) {  
				var emoji = JMessage.emoji.tabOne;
				$("<li onclick='selectEmotionImg(this);' id="+emoji[i]+">"+emoji[i]+"</li>").appendTo($(divId));
			};
			emojify.run();
		};
		JMessage.initEmojiPanelTwo = function(divId){
			//  设置动画表情的面板数据
			for (var i=0; i<JMessage.emoji.tabTwo.length; i++) {  
				var emoji = JMessage.emoji.tabTwo;
				$("<li onclick='selectEmotionImg(this);' id="+emoji[i]+">"+emoji[i]+"</li>").appendTo($(divId));
			};
			emojify.run();
		};
		//  end of define jpush im emoji data
		  
	    //  消息内容封包
	   JMessage.buildMessageContent = function(juid, sid, rid, target_type, msg_type,target_id, target_name,
	    														from_id, from_name, create_time, content){
		   msgContent.appKey = this.appKey;
		   msgContent.juid = juid || "";
	    	msgContent.sid = sid || "";
	    	msgContent.rid = rid || "";
		   msgContent.target_type = target_type || "";
	    	msgContent.target_id = target_id || "";
	    	msgContent.target_name = target_name || "";
	    	msgContent.from_id = from_id || "";
	    	msgContent.from_name = from_name || "";
	    	msgContent.create_time = create_time || "";
	    	msgContent.msg_type = msg_type || "";
	    	msgContent.msg_body = content || "";
	    	return msgContent;
	    }
	    return JMessage;
})();

