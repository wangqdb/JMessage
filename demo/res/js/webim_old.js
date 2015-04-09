

	var uid = null;
	var curUserId = null;  //  当前用户id
	var curChatUserId = null;  //  当前聊天对象id
	var curChatGroupId = null;  // 当前聊天Group id
	var curChatUserSessionId  = null;  // websocket connection sessionId
	var preChatUserId = null;  // 前一个聊天对象
	var preChatGroupId = null; // 前一个群组对象
	var msgCardDivId = "chat01";
	var talkToDivId = "talkTo";
	var isSingleOrGroup = "single";  //  区分是单聊还是群聊
	var user_name = null;
	var uploadToken = null;
	var socket = null;


	//  初始化消息监听
	var addEventListener = function(socket){
		//连接事件绑定
		socket.on('connectSuccess', function(){
			console.log('resp connect.');
			var message = 'user:'+user_name+'login';
			user_name = $('#user_name').val();
			var password = $('#password').val();
			socket.emit('loginevent', {appKey: JPushIMConfig.AppKey, userName: user_name, password: password});  // 连接成功后触发登陆
		});

		//  事件绑定
		//var socket = io.connect("http://127.0.0.1:9092", {'reconnect':true,'upgrade':true});
		//var socket = io.connect("http://127.0.0.1:9092");  //  polling

		//  处理用户登陆返回的 uid
		socket.on('loginevent', function(data){
			console.log('resp login event.');
			if(data!=null && data.uid!=0){
				uid = data.uid;
				curUserId = uid;
			} else {
				$('#waitLoginmodal').css({"display":"none"});
				alert('登陆失败，可能您的帐号不对.');
				location.reload();   //  重新加载
				return;
			}
			createConversionlistUL();  //  创建会话列表
			socket.emit('getContracterList', {user_name: user_name});   // 获取联系人列表
			socket.emit('getGroupsList', {uid: uid});   // 获取群组列表
			$('#waitLoginmodal').css({"display":"none"});
			$('#content').css({"display":"block"});
		});

		//   获取到上传token后可上传图片到七牛云
		socket.on('getUploadToken',function(data){
			
			uploadToken = data;
			var key = getResourceId(uid);
			$('#token').val(uploadToken);
			console.log('token: '+uploadToken);
			var mediaId = 'image/'+key;
			console.log('media id: '+mediaId);
			$('#key').val(mediaId);
			
			//  上传图片到七牛
			var uploader = Qiniu.uploader({
		        runtimes: 'html5,flash,html4',    
		        browse_button: 'fileChooseBtn',            
		        uptoken : uploadToken, 
		        url: 'http://upload.qiniu.com',
		        domain: JPushIMConfig.ResUrl,
		        container: 'fileContainer',   
		        max_file_size: '100mb',   
		        flash_swf_url: './Moxie.swf',
		        max_retries: 3,                 
		        dragdrop: true,  
		        unique_names: false, 
		        save_key: false,
		        drop_element: 'container',   
		        chunk_size: '4mb',                
		        auto_start: true,               
		        init: {
		        	   'FilesAdded': function(up, files) {
		                   plupload.each(files, function(file) {
		                	   console.log(file);
		                	   $('#picFileModal').modal('hide');
		                   		});
		        	    },
		            'Error': function(up, err, errTip) {
		                   console.log(err);
		            	},
		            'UploadComplete': function() {
		                  console.log('upload done.');
		                  var src = JPushIMConfig.ResUrl + '/' + mediaId + '?imageView2/2/h/100';
		               	appendPicMsgSendByMe("<img onclick='zoomOut(this)' src="+ src +" width='100px;' height='70px;' style='cursor:pointer'></img>");
		               	var toUserName = $('#'+curChatUserId).attr('username');
		               	socket.emit('chatevent', {uid: uid, toUid: curChatUserId, userName:user_name, toUserName: toUserName, message: src, msgType:'single'});
		            	},
		            'Key': function(up, file) {
		                var key = mediaId;
		                return key
		            	},
		            'FileUploaded': function(up, file, info) {
		            	
		            	}
		        	}
		    	});
		});
		
		// 监听获取联系人
		socket.on('getContracterList', function(data){
			console.log('resp getContracterList.');
			createContactlistUL();  // 创建联系人列表UI
			var uielem = document.getElementById("contactlistUL");
			for (i = 0; i < data.length; i++) {
				var lielem = document.createElement("li");
				$(lielem).attr({
					'id' : data[i].uid,
					'username' : data[i].username,
					/*'sessionId' : data[i].session_id,*/
					'class' : 'online',
					'className' : 'online',
					'onclick': 'chooseContactDivClick(this)',
					'chat' : 'chat',
					'displayName' : data[i].username,
					/*'online' : data[i].online*/
				});
				/*if(data[i].online){
					$(lielem).css({
						"background": "#B0C4DE"
					});
				} else {
					$(lielem).css({
						"background": "#708090"
					});
				}*/
				/*lielem.onclick = function() {
					chooseContactDivClick(this);
				};*/
				var imgelem = document.createElement("img");
				imgelem.setAttribute("src", "../../res/img/head/contact_normal.png");
				imgelem.setAttribute("style", "border-radius: 50%;");
				
				var unreadelem = document.createElement("img");
				unreadelem.setAttribute("src", "../../res/img/msg_unread.png");
				unreadelem.setAttribute("class", "unread");
				unreadelem.setAttribute("style", "visibility:hidden");
				lielem.appendChild(imgelem);
				lielem.appendChild(unreadelem);

				var spanelem = document.createElement("span");
				$(spanelem).attr({
					"class" : "contractor-display-style"
				});
				spanelem.innerHTML = data[i].username;
				
//				var recr_msg_elem = document.createElement("span");
//				$(recr_msg_elem).attr({
//					"class" : "rect-msg-display-style"
//				});
//				recr_msg_elem.innerHTML = '最新消息...';
				
				lielem.appendChild(spanelem);
//				lielem.appendChild(recr_msg_elem);
				uielem.appendChild(lielem);
			}
			var contactlist = document.getElementById('contractlist');
			var children = contactlist.children;
			if (children.length > 0) {
				contactlist.removeChild(children[0]);
			}
			contactlist.appendChild(uielem);
			//  默认选择与第一个联系人聊天
			if(data.length>0){
				setCurrentContact(data[0].uid);
			}
		});

		//监听获取群组
		socket.on('getGroupsList', function(data){
			console.log('resp getGroupList.');
			createGroupslistUL();  // 创建群组列表UI
			var uielem = document.getElementById("grouplistUL");
			for (i = 0; i < data.length; i++) {
				var lielem = document.createElement("li");
				$(lielem).attr({
					'id' : data[i].gid,
					'chat' : 'chat',
					'onclick': 'chooseGroupDivClick(this)',
					'displayName' : data[i].group_name,
				});
				
				/*lielem.onclick = function() {
					chooseGroupDivClick(this);
				};*/
				var imgelem = document.createElement("img");
				imgelem.setAttribute("src", "../../res/img/head/group_normal.png");
				imgelem.setAttribute("style", "border-radius: 50%;");
				
				var unreadelem = document.createElement("img");
				unreadelem.setAttribute("src", "../../res/img/msg_unread.png");
				unreadelem.setAttribute("class", "unread");
				unreadelem.setAttribute("style", "visibility:hidden");
				lielem.appendChild(imgelem);
				lielem.appendChild(unreadelem);
				
				var spanelem = document.createElement("span");
				$(spanelem).attr({
					"class" : "contractor-display-style"
				});
				spanelem.innerHTML = data[i].group_name;
				lielem.appendChild(spanelem);
				uielem.appendChild(lielem);
			}
			var grouplist = document.getElementById('grouplist');
			var children = grouplist.children;
			if (children.length > 0) {
				grouplist.removeChild(children[0]);
			}
			grouplist.appendChild(uielem);
			//  默认选择与第一个群组
			if(data.length>0)
				curChatGroupId = data[0].gid;
			//createGroupChatDiv(curChatGroupId);
			preChatGroupId = curChatGroupId;
		});

		//  监听用户聊天
		socket.on('chatevent',function(data){
			appendMsgSendByOthers(data.userName, data.message, data.toUserName, data.msgType);
		});

		//  监听用户断开
		socket.on('disconnect',function(){
			console.log('resp disconnect.');
			console.log('disconnect to the server.');
			alert('您已经与服务器断开，请重新连接.');
		});
		
	} 


	//绑定用户登陆处理
	$('#login_submit').click(function(){
		console.log('user login submit.');
		$('#loginPanel').css({"display":"none"});
		$('#waitLoginmodal').css({"display":"block"}); 
		socket = io.connect("http://127.0.0.1:9092",{'transports':['websocket']});  //  websocket
		addEventListener(socket);
	});



	var showChooseFileDialog = function(){
		$('#picFileModal').modal('show');
		//  获取图片上传token
		socket.emit('getUploadToken');
	}

		
	//  左边栏仿tab处理
	$('#conversionTab').click(function(){
		$("#conversionlist").css({
			display:"block"
		});
		$("#contractlist").css({
			display:"none"
		});
		$('#grouplist').css({
			display:"none"
		});
	});
	$('#friendsTab').click(function(){
		$("#contractlist").css({
			display:"block"
		});
		$("#conversionlist").css({
			display:"none"
		});
		$('#grouplist').css({
			display:"none"
		});
	});

	$('#groupsTab').click(function(){
		$('#grouplist').css({
			display:"block"
		});
		$("#conversionlist").css({
			display:"none"
		});
		$("#contractlist").css({
			display:"none"
		});
	});

	//  回车键发送消息
	function stopDefault(e) {  
	    //如果提供了事件对象，则这是一个非IE浏览器   
	    if(e && e.preventDefault) {  
	    	e.preventDefault();  
	    } else {  
	    	window.event.returnValue = false;   
	    }  
	    return false;  
	}  

	//  监听用户按键，处理回车键事件
	document.onkeydown = function(event){
		var e = event || window.event || arguments.callee.caller.arguments[0];      
	   if(e && e.keyCode==13){ //enter
		   stopDefault(e);
		   var content = document.getElementById('talkInputId').value;
		   if(content!=''){
			   appendMsgSendByMe(content);
			   var toUserName = $('#'+curChatUserId).attr('username');
			   if(isSingleOrGroup=='single'){
				   addToConversionList(curChatUserId);  //   添加该会话到会话列表
				   updateConversionRectMsg(curChatUserId, content);
			   	socket.emit('chatevent', {uid: uid, toUid: curChatUserId, userName:user_name, toUserName: toUserName, message: content, msgType:'single'});
			   } else if(isSingleOrGroup=='group'){
				   addToConversionList(curChatGroupId);  //   添加该会话到会话列表
				   updateConversionRectMsg(curChatGroupId, content);
			   	socket.emit('chatevent', {uid: uid, toUid: curChatGroupId, userName:user_name, toUserName:toUserName, message: content, msgType:'group'});
			    } 
		   } else {
			   alert('您还未输入.');
		   }
		   document.getElementById('talkInputId').value = '';
	    }
	}; 

	//  用户发送消息
	function sendText(){
		 var content = document.getElementById('talkInputId').value;
		 if(content==''){
			  alert('您还未输入.');
			  return;
		  } 
	 	 appendMsgSendByMe(content);
	    document.getElementById('talkInputId').value = '';
	    var toUserName = $('#'+curChatUserId).attr('username');
	    if(isSingleOrGroup=='single'){
	    	addToConversionList(curChatUserId);  //   添加该会话到会话列表
	    	updateConversionRectMsg(curChatUserId, content);
	    	socket.emit('chatevent', {uid: uid, toUid: curChatUserId, userName:user_name, toUserName: toUserName, message: content, msgType:'single'});
	    } else if(isSingleOrGroup=='group'){
	    	addToConversionList(curChatGroupId);  //   添加该会话到会话列表
	    	updateConversionRectMsg(curChatGroupId, content);
	    	socket.emit('chatevent', {uid: uid, toUid: curChatGroupId, userName:user_name, toUserName: toUserName, message: content, msgType:'group'});
	     } 
	};
		 
	//   添加会话到会话列表中
	var addToConversionList = function(id){
		var length = $("#conversionlistUL li").length;
		for(var i=0; i<length; i++){  //  检查是否添加重复项
			 var lielem = $("#conversionlistUL li")[i];
			 var lid = $(lielem).attr('id');
			 if(lid=='conversion-'+id)
				 return;
		}
		
		var node = $('#'+id).clone(true);
		var newId = 'conversion-'+$(node).attr('id');
		$(node).attr('id', newId);
		
		//  添加显示最近的消息
		var recr_msg_elem = document.createElement("span");
		$(recr_msg_elem).attr({
			'id' : id+'-rect-msg',
			"class" : "rect-msg-display-style"
		});
		
		/*if(isSingleOrGroup=='single'){
			node.onclick = function(){
				chooseConversionSingleDivClick(this);
			};
		} else if(isSingleOrGroup=='group'){
			node.onclick = function(){
				chooseConversionGroupDivClick(this);
			};
		}*/
		$('#conversionlistUL').prepend(node);
		$('#'+newId).append(recr_msg_elem);
	}

	//  更新会话列表中的最近消息状态
	var updateConversionRectMsg = function(id, msg){
		$('#'+id+'-rect-msg').html(msg);
		emojify.run();
	}


	//  获取当前聊天记录的窗口div
	var getContactChatDiv = function(chatUserId) {
		return document.getElementById(curUserId + "-" + chatUserId);
	};

	//  获取当前群组聊天记录的窗口
	var getGroupChatDiv = function(chatGroupId) {
		return document.getElementById(curUserId + "-" + chatGroupId);
	};
		
	//  创建一个联系人聊天窗口
	var createContactChatDiv = function(chatUserId) {
		var msgContentDivId = curUserId + "-" + chatUserId;
		var newContent = document.createElement("div");
		newContent.setAttribute("id", msgContentDivId);
		newContent.setAttribute("class", "chat01_content");
		newContent.setAttribute("className", "chat01_content");
		newContent.setAttribute("style", "display:none");
		return newContent;
	};

	//  创建一个群组聊天窗口
	var createGroupChatDiv = function(chatGroupId) {
		var msgContentDivId = curUserId + "-" + chatGroupId;
		var newContent = document.createElement("div");
		newContent.setAttribute("id", msgContentDivId);
		newContent.setAttribute("class", "chat01_content");
		newContent.setAttribute("className", "chat01_content");
		newContent.setAttribute("style", "display:none");
		return newContent;
	};
		
	//  创建联系人列表UI
	var createContactlistUL = function() {
		var uielem = document.createElement("ul");
		$(uielem).attr({
			"id" : "contactlistUL",
			"class" : "chat03_content_ul"
		});
		var contactlist = document.getElementById("contractlist");
		contactlist.appendChild(uielem);
	};

	//  创建群组列表UI
	var createGroupslistUL = function() {
		var uielem = document.createElement("ul");
		$(uielem).attr({
			"id" : "grouplistUL",
			"class" : "chat03_content_ul"
		});
		var contactlist = document.getElementById("grouplist");
		contactlist.appendChild(uielem);
	};

	//   创建会话列表UI
	var createConversionlistUL = function() {
		var uielem = document.createElement("ul");
		$(uielem).attr({
			"id" : "conversionlistUL",
			"class" : "chat03_content_ul"
		});
		var contactlist = document.getElementById("conversionlist");
		contactlist.appendChild(uielem);
	};
		
	//  设置当前联系人界面
	var setCurrentContact = function(defaultUserId) {
		showContactChatDiv(defaultUserId);
		if (curChatUserId != null) {
			hiddenContactChatDiv(curChatUserId);
		} else {
			$('#null-nouser').css({
				"display" : "none"
			});
		}
		curChatUserId = defaultUserId;
		preChatUserId = curChatUserId;
	};
		
	//  显示与联系人聊天的窗口
	var showContactChatDiv = function(chatUserId) {
		var contentDiv = getContactChatDiv(chatUserId);
		if (contentDiv == null) {
			contentDiv = createContactChatDiv(chatUserId);
			document.getElementById(msgCardDivId).appendChild(contentDiv);
		}
		contentDiv.style.display = "block";
		var contactLi = document.getElementById(chatUserId);
		var conversionLi = document.getElementById('conversion-'+chatUserId);
		//var contactLi = $('[id='+chatUserId+']');
		if(contactLi == null){
			return;
		}
		if(conversionLi!=null){
			conversionLi.style.backgroundColor = "#B0E0E6";
		}
		contactLi.style.backgroundColor = "#B0E0E6";
		//contactLi.css({'background-color':'#B0E0E6'});
		var chatName = $('#'+chatUserId).attr('username');
		var dispalyTitle = "与 " + chatName + " 聊天中";
		document.getElementById(talkToDivId).children[0].innerHTML = dispalyTitle;
	};

	//  显示群组的聊天窗口
	var showGroupChatDiv = function(chatGroupId) {
		var contentDiv = getGroupChatDiv(chatGroupId);
		if (contentDiv == null) {
			contentDiv = createGroupChatDiv(chatGroupId);
			document.getElementById(msgCardDivId).appendChild(contentDiv);
		}
		contentDiv.style.display = "block";
		var contactLi = document.getElementById(chatGroupId);
		var conversionLi = document.getElementById('conversion-'+chatGroupId);
		//var contactLi = $('[id='+chatGroupId+']');
		if(contactLi==null){
			return;
		}
		if(conversionLi){
			conversionLi.style.backgroundColor = "#B0E0E6";
		}
		contactLi.style.backgroundColor = "#B0E0E6";
		//contactLi.css({'background-color':'#B0E0E6'});
		var group_name = $('#'+chatGroupId).attr("displayName");
		var dispalyTitle = "正在 " + group_name + " 群里聊天中";
		document.getElementById(talkToDivId).children[0].innerHTML = dispalyTitle;
	};
		
	//对上一个联系人的聊天窗口做隐藏处理
	var hiddenContactChatDiv = function(chatUserId) {
		var contactLi = document.getElementById(chatUserId);
		var conversionLi = document.getElementById('conversion-'+chatUserId);
		//var contactLi = $('[id='+chatUserId+']');
		if (contactLi) {
			contactLi.style.backgroundColor = "";
			//contactLi.css({'background-color':''});
		}
		if(conversionLi){
			conversionLi.style.backgroundColor = "";
		}
		var contentDiv = getContactChatDiv(chatUserId);
		if (contentDiv) {
			contentDiv.style.display = "none";
		}
	};

	//对上一个群组的聊天窗口做隐藏处理
	var hiddenGroupChatDiv = function(chatGroupId) {
		var contactLi = document.getElementById(chatGroupId);
		var conversionLi = document.getElementById('conversion-'+chatGroupId);
		if (contactLi) {
			contactLi.style.backgroundColor = "";
		}
		if(conversionLi){
			conversionLi.style.backgroundColor = "";
		}
		var contentDiv = getGroupChatDiv(chatGroupId);
		if (contentDiv) {
			contentDiv.style.display = "none";
		}
	};

	// 切换联系人聊天窗口div
	var chooseContactDivClick = function(li) {
		var chatUserId = li.id;
		var indexPos = chatUserId.indexOf("conversion");
		if(indexPos!=-1){
			chatUserId = li.id.split('-')[1];
			hideUnreadMsgMark(chatUserId);
		}
		//curChatUserSessionId = li.sessionId;
		if ((chatUserId != curChatUserId)) {
			if (curChatUserId == null) {
				createContactChatDiv(chatUserId);
			} else {
				showContactChatDiv(chatUserId);
				hiddenContactChatDiv(curChatUserId);
			}
		} else {
			showContactChatDiv(chatUserId);
		}
		if(curChatGroupId != null){
			hiddenGroupChatDiv(curChatGroupId);
		}
		curChatUserId = chatUserId;
		$('#null-nouser').css({
			"display" : "none"
		});
		// 对前一个聊天用户的背景作处理
		var preUser = $('#'+preChatUserId);
		/*if(preUser.attr('online')=='true'){
			preUser.css({
				"background": "#B0C4DE"
			});
		} else {
			preUser.css({
				"background": "#708090"
			});
		}*/
		isSingleOrGroup = "single";
		preChatUserId = chatUserId;
	};

	//  切换群组聊天窗口div
	var chooseGroupDivClick = function(li) {
		var chatGroupId = li.id;
		var indexPos = chatGroupId.indexOf("conversion");
		if(indexPos!=-1){
			chatGroupId = li.id.split('-')[1];
			hideUnreadMsgMark(chatGroupId);
		}
		if ((chatGroupId != curChatGroupId)) {
			if (curChatGroupId == null) {
				createGroupChatDiv(chatGroupId);
			} else {
				showGroupChatDiv(chatGroupId);
				hiddenGroupChatDiv(curChatGroupId);
			}
		} else {
			showGroupChatDiv(chatGroupId);
		}
		$('#null-nouser').css({
			"display" : "none"
		});
		if(curChatUserId != null){
			hiddenContactChatDiv(curChatUserId);
		}
		curChatGroupId = chatGroupId;
		isSingleOrGroup = "group";
	};
		 
	//   添加对方发送的聊天信息到显示面板
	var appendMsgSendByOthers = function(name, message, contact, chattype){
		if(chattype=='single'){
			var contactUL = document.getElementById("contactlistUL");
			if (contactUL.children.length == 0) {
				return null;
			}
			var contactDivId = name;
			var contactLi = getContactLi('conversion-'+name);
			if(contactLi==null){
				addToConversionList(contactDivId);
				contactLi = getContactLi('conversion-'+name);
			}
			var date = new Date();
			var time = date.toLocaleTimeString();
			var headstr = [ "<p1>" + $('#'+name).attr('username') + "   <span></span>" + "   </p1>",
					"<p2>" + time + "<b></b><br/></p2>" ];
			var header = $(headstr.join(''))

			var lineDiv = document.createElement("div");
			var lineDivStyle = document.createAttribute("style");
			lineDivStyle.nodeValue = "margin: 0px 10px 6px 10px;"; 
			lineDiv.setAttributeNode(lineDivStyle); 
			for ( var i = 0; i < header.length; i++) {
				var ele = header[i];
				lineDiv.appendChild(ele);
			}
				
			var eletext = "<p3>" + message + "</p3>";
			var ele = $(eletext);
			ele[0].setAttribute("class", "chat-content-p3");
			ele[0].setAttribute("className", "chat-content-p3");
			ele[0].style.backgroundColor = "#9EB867";
			
			for ( var j = 0; j < ele.length; j++) {
				lineDiv.appendChild(ele[j]);
			}
						
			//if (curChatUserId.indexOf(contact) < 0) {
				showUnreadMsgMark(name);
				//contactLi.style.backgroundColor = "#FF4500";
				//contactLi.css({'background-color':'#FF4500'});
			//}
				 
			var msgContentDiv = getContactChatDiv(contactDivId);
			lineDiv.style.textAlign = "left";
			
			var create = false;
			if (msgContentDiv == null) {
				msgContentDiv = createContactChatDiv(contactDivId);
				create = true;
			}
			msgContentDiv.appendChild(lineDiv);
			if (create) {
				document.getElementById(msgCardDivId).appendChild(msgContentDiv);
			}
			msgContentDiv.scrollTop = msgContentDiv.scrollHeight;
			updateConversionRectMsg(contactDivId, message);  //  更新会话列表中最新的消息
			emojify.run();
			return lineDiv;
		}
		if(chattype=='group'){
			var groupUL = document.getElementById("grouplistUL");
			if (groupUL.children.length == 0) {
				return null;
			}
			
			var contactDivId = contact;
			var contactLi = getContactLi('conversion-'+contact);
			if(contactLi==null){
				addToConversionList(contactDivId);
				contactLi = getContactLi('conversion-'+name);
			}
			var date = new Date();
			var time = date.toLocaleTimeString();
			var headstr = [ "<p1>" + $('#'+name).attr('displayname') + "   <span></span>" + "   </p1>",
					"<p2>" + time + "<b></b><br/></p2>" ];
			var header = $(headstr.join(''))

			var lineDiv = document.createElement("div");
			var lineDivStyle = document.createAttribute("style");
			lineDivStyle.nodeValue = "margin: 0px 10px 6px 10px;"; 
			lineDiv.setAttributeNode(lineDivStyle); 
			for ( var i = 0; i < header.length; i++) {
				var ele = header[i];
				lineDiv.appendChild(ele);
			}
				
			var eletext = "<p3>" + message + "</p3>";
			var ele = $(eletext);
			ele[0].setAttribute("class", "chat-content-p3");
			ele[0].setAttribute("className", "chat-content-p3");
			ele[0].style.backgroundColor = "#9EB867";
			
			for ( var j = 0; j < ele.length; j++) {
				lineDiv.appendChild(ele[j]);
			}
						
			//if (curChatGroupId.indexOf(contact) < 0) {
				showUnreadMsgMark(name);
				//contactLi.style.backgroundColor = "#FF4500";
				//contactLi.css({'background-color':'#FF4500'});
			//}
				 
			var msgContentDiv = getGroupChatDiv(contactDivId);
			lineDiv.style.textAlign = "left";
			
			var create = false;
			if (msgContentDiv == null) {
				msgContentDiv = createGroupChatDiv(contactDivId);
				create = true;
			}
			msgContentDiv.appendChild(lineDiv);
			if (create) {
				document.getElementById(msgCardDivId).appendChild(msgContentDiv);
			}
			msgContentDiv.scrollTop = msgContentDiv.scrollHeight;
			updateConversionRectMsg(contactDivId, message);  //  更新会话列表中最新的消息
			emojify.run();
			return lineDiv;
		}
	};
		
	//  显示未读消息标记
	var showUnreadMsgMark = function(id){
		$('#conversionlist'+' li#conversion-'+id+' img.unread').css("visibility","visible");
	}

//		取消未读消息标记
	var hideUnreadMsgMark = function(id){
		$('#conversionlist'+' li#conversion-'+id+' img.unread').css("visibility","hidden");
	}

	//  添加自己发送的聊天信息到显示面板
	var appendMsgSendByMe = function(message) {
		var date = new Date();
		var time = date.toLocaleTimeString();
		var headstr = [ "<p1> 我 <span></span>" + "   </p1>",
				"<p2>" + time + "<b></b><br/></p2>" ];
		var header = $(headstr.join(''))

		var lineDiv = document.createElement("div");
		var lineDivStyle = document.createAttribute("style");
		lineDivStyle.nodeValue = "margin: 0px 10px 6px 10px;"; 
		lineDiv.setAttributeNode(lineDivStyle); 
		for ( var i = 0; i < header.length; i++) {
			var ele = header[i];
			lineDiv.appendChild(ele);
		}
		
		var eletext = "<p3>" + message + "</p3>";
		var ele = $(eletext);
		ele[0].setAttribute("class", "chat-content-p3");
		ele[0].setAttribute("className", "chat-content-p3");
		ele[0].style.backgroundColor = "#9EB867";
			
		for ( var j = 0; j < ele.length; j++) {
				lineDiv.appendChild(ele[j]);
		}
		
		var msgContentDiv;
		if(isSingleOrGroup=='single'){
			msgContentDiv = getContactChatDiv(curChatUserId); 
		} else if(isSingleOrGroup=='group'){
			msgContentDiv = getGroupChatDiv(curChatGroupId); 
		}
		lineDiv.style.textAlign = "right";
		
		var create = false;
		if (msgContentDiv == null) {
			if(isSingleOrGroup=='single'){
				msgContentDiv = createContactChatDiv(curChatUserId);
			} else {
				msgContentDiv = createGroupChatDiv(curChatUserId);
			}
			create = true;
		}
		msgContentDiv.appendChild(lineDiv);
		if (create) {
			document.getElementById(msgCardDivId).appendChild(msgContentDiv);
		}
		msgContentDiv.scrollTop = msgContentDiv.scrollHeight;
		emojify.run();
		return lineDiv;
	}; 

	//  添加自己发送的图片消息到消息面板
	var appendPicMsgSendByMe = function(message) {
		var date = new Date();
		var time = date.toLocaleTimeString();
		var headstr = [ "<p1> 我 <span></span>" + "   </p1>",
				"<p2>" + time + "<b></b><br/></p2>" ];
		var header = $(headstr.join(''))

		var lineDiv = document.createElement("div");
		var lineDivStyle = document.createAttribute("style");
		lineDivStyle.nodeValue = "margin: 0px 10px 6px 10px;"; 
		lineDiv.setAttributeNode(lineDivStyle); 
		for ( var i = 0; i < header.length; i++) {
			var ele = header[i];
			lineDiv.appendChild(ele);
		}
		
		var eletext = "<p3 >" + message + "</p3>";
		var ele = $(eletext);
		ele[0].setAttribute("class", "chat-content-pic");
		ele[0].setAttribute("className", "chat-content-pic");
		ele[0].style.backgroundColor = "#9EB867";
			
		for ( var j = 0; j < ele.length; j++) {
				lineDiv.appendChild(ele[j]);
		}
		
		var msgContentDiv;
		if(isSingleOrGroup=='single'){
			msgContentDiv = getContactChatDiv(curChatUserId); 
		} else if(isSingleOrGroup=='group'){
			msgContentDiv = getGroupChatDiv(curChatGroupId); 
		}
		lineDiv.style.textAlign = "right";
		
		var create = false;
		if (msgContentDiv == null) {
			if(isSingleOrGroup=='single'){
				msgContentDiv = createContactChatDiv(curChatUserId);
			} else {
				msgContentDiv = createGroupChatDiv(curChatUserId);
			}
			create = true;
		}
		msgContentDiv.appendChild(lineDiv);
		if (create) {
			document.getElementById(msgCardDivId).appendChild(msgContentDiv);
		}
		msgContentDiv.scrollTop = msgContentDiv.scrollHeight;
		emojify.run();
		return lineDiv;
	};
	 	
	//  选择联系人的处理
	var getContactLi = function(chatUserId) {
		return document.getElementById(chatUserId);
		//return $('[id='+chatUserId+']');
	};

	//  emoji 选择框
	var showEmotionDialog = function() {
		$('#wl_faces_box').css({
			"display" : "block"
		});
		emojify.run();
	};

	//  表情选择div的关闭方法
	var turnoffFaces_box = function() {
		$("#wl_faces_box").css({'display':'none'});
	};

	//  选择emoji表情
	var selectEmotionImg = function(selImg) {
		var origin_content = document.getElementById('talkInputId').value;
		var content = origin_content +' '+ selImg.id;
		document.getElementById('talkInputId').value = content;
		$('#talkInputId').text(content);
		$('#talkInputId').focus();
	};

	/** emoji 相关配置  **/
	emojify.setConfig({
	    emojify_tag_type : 'img',         
	    only_crawl_id    : null,            
	    img_dir          : '../../res/img/emoji',  
	    ignored_tags     : {               
	        'SCRIPT'  : 1,
	        'TEXTAREA': 1,
	        'A'       : 1,
	        'PRE'     : 1,
	        'CODE'    : 1
	    }
	});
	emojify.run();
	/****/

	//  初始化 emoji 和 动画表情面板 
	(function(){
		//设置基本表情的面板数据
		var sjson = new Array(':bowtie:',':smile:',':laughing:',':blush:',':smiley:',':relaxed:',
										':smirk:',':purple_heart:',':heart:',':green_heart:',':broken_heart:',
										':heartbeat:',':heartpulse:',':two_hearts:',':revolving_hearts:',':cupid:',
										':sparkling_heart:',':sparkles:', ':ribbon:', ':tophat:' ,':crown:' ,':womans_hat:',
										':mans_shoe:', ':closed_umbrella:', ':briefcase:', ':handbag:', ':pouch:', ':purse:', ':eyeglasses:',
										':fishing_pole_and_fish:', ':coffee:', ':tea:', ':sake:', ':baby_bottle:', ':beer:', 
									   ':beers:', ':cocktail:', ':tropical_drink:' ,':wine_glass:' ,':fork_and_knife:'
		);
		for (var i=0; i<sjson.length; i++) {  
			$("<li onclick='selectEmotionImg(this);' id="+sjson[i]+">"+sjson[i]+"</li>").appendTo($('#emotionUL'));
		};
		
		//  设置动画表情的面板数据
		var cartonjson = new Array(':arrow_double_down:', ':arrow_double_up:', ':arrow_down_small:', ':arrow_heading_down:', 
											':arrow_heading_up:', ':leftwards_arrow_with_hook:', ':arrow_right_hook:', ':left_right_arrow:',
											':arrow_up_down:', ':arrow_up_small:', ':arrows_clockwise:', ':arrows_counterclockwise:',
												':rewind:', ':fast_forward:', ':information_source:', ':ok:', ':twisted_rightwards_arrows:', 
													':repeat:', ':repeat_one:', ':new:', ':top:', ':up:', ':cool:', ':free:', ':ng:', ':cinema:', ':koko:'
		);
		for (var i=0; i<cartonjson.length; i++) {  
			$("<li onclick='selectEmotionImg(this);' id="+cartonjson[i]+">"+cartonjson[i]+"</li>").appendTo($('#carton_emotionUL'));
		};
	})();

	//  清理当前聊天窗口
	var clearCurrentChat = function(){
		console.log("clean the chat window.");
	}
		
	//  选择图片
	var picfile;
	$('#file').on('change', function(){
		picfile = this;
	});

	//  发送图片消息
	var sendPicFile = function(){
		var myDate = new Date();
		var mytime = myDate.getTime();
		appendPicMsgSendByMe("<img onclick='zoomOut(this)' id="+mytime+" width='100px;' height='70px;' style='cursor:pointer'></img>");
		preivew(picfile, mytime);
		//$('#file').val('');
	}

	//  点击浏览原图
	var zoomOut = function(obj){
		var src = $(obj).attr('src');
		var origin_src = src.split('?')[0];
		$('#zoomOutPic').attr('src', origin_src);
		$('#zoomOutPicView').modal('show');
	}

	//  显示好友列表
	var showFriendsList = function(){
		
	}

	//  表情面板切换---> 符号表情
	var changeSimbolPanel = function(){
		$('#wl_faces_main_simpol').css({
			'display':'block'
		});
		$('.title_name_simbol').css({
			'background':'#A0A0A0'
		});
		$('.title_name_carton').css({
			'background':''
		});
		$('#wl_faces_main_carton').css({
			'display':'none'
		});
	}

	//  表情面板切换---> 卡通表情
	var changeCartonPanel = function(){
		$('#wl_faces_main_carton').css({
			'display':'block'
		});
		$('.title_name_carton').css({
			'background':'#A0A0A0'
		});
		$('.title_name_simbol').css({
			'background':''
		});
		$('#wl_faces_main_simpol').css({
			'display':'none'
		});
	}



