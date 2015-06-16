/**
the script file is the logic of JChat

@author chujieyang <yangcj@jpush.cn>
@date 2015-05-12
**/ 

/* --------------   自定义全局变量  -------------------- */
var curChatUserId = null;  //  当前聊天对象id
var curChatGroupId = null;  // 当前聊天Group id
var loginStatus = false;
var isReady = false;
var msgCardDivId = "chat01";
var talkToDiv = "talkTo";
var isSingleOrGroup = "single";  //  标识是单聊还是群聊
var isFirstLogin = true;
var isNeedUpdateGroupName = false;
var tmpGroupName = null;
var curPreviewPic = null;
var debug = true;
//var JMessage_http_server_url = 'http://webchatserver.im.jpush.cn:80/signature';
var JMessage_http_server_url = 'http://127.0.0.1:9093/signature';
/* -------------- 自定义数据结构存储 ------------------- */
var IM = {
	contacts: {
		// 存储 username -> UserModal 的数据
	},
	groups: {
		// 存储 gid -> GroupModal 的数据
	},
	groupInfo: {
		// gid -> groupInfo
	},
	session: {
		// session -> last chat time
	},
	beenRemovedGroups: {
		// gid -> username 存储用户被移除的群组，来达到相应群组信息的隐藏
	}
};

/* ----------------JMessage event------------------ */

JMessage.init();

JMessage.ready(function(){
	if(debug)
		console.info('config ready');
	isReady = true;
});

JMessage.error(function(code, message){
	showErrorInfo(code);
	if(debug) 
		console.error('config error code: '+code+', message: '+message);
});

JMessage.notification(function(code, message){
	if(872008==code){
		$('#multiLoginInfoPanel').css({"display": "block"});
	}
});

JMessage.onConnected(function(){
	if(debug)
		console.info('connect success');
	$.ajax({
		url: JMessage_http_server_url,
		method: 'GET',
		dataType : 'jsonp',
     		jsonp: 'jsoncallback',
     		jsonpCallback: 'jsonpCallback',
	});
});

var jsonpCallback = function(data){
     	JMessage.config({
     		debug: true,
		appKey: '4f7aef34fb361292c566a1cd',
		timestamp: data.timeStamp,
		randomStr: data.randomStr,
		signature: data.signature 
	});
};

JMessage.onDisconnected(function(){
	showMsg('连接断开，正在为您重连...');
	if(debug) 
		console.error('您与服务器断开，请刷新重连');
	$('#login-error-info').text('您与服务器断开，请刷新重连');
	$('#login').removeAttr("disabled");
	$('#login').text("登陆");
});

// 接收消息
JMessage.onMessageReceived(function(jMessage){
	if(debug)
		console.info(jMessage);
	var message = JSON.parse(jMessage);
	appendMsgSendByOthers(message.fromId, message.fromName, message.msgBody,
		message.createTime, message.targetType, message.msgType, message.targetId);
});

// receive event
JMessage.onEventReceived(function(jMessage){
	if(debug)
		console.info('event data: '+jMessage);
	var eventData = JSON.parse(jMessage);
	showEventNotification(eventData);
});


/* -------- Extend Array Function ------------ */
Array.prototype.indexOf = function(val) {
	for (var i = 0; i < this.length; i++) {
		if (this[i] == val) return i;
	}
	return -1;
};
Array.prototype.remove = function(val) {
	var index = this.indexOf(val);
	if (index > -1) {
		this.splice(index, 1);
	}
};
/* ---------------------------------------------- */

/* ------------- JChat logic ------------------ */
// 用户登陆
var login = function(){
	var beginTime = new Date();
	var username = $.trim($('#username').val());
	var password = $.trim($('#password').val());
	if(username==''||username==undefined
	    ||password==''||password==undefined){
		$('#login-error-info').text('请输入用户名和密码');
		return;
	}
	
	$('#login').text("正在登陆 ...");
	$('#login').attr("disabled","disabled");

 	if(isReady){
 		JMessage.login({
			username: username,
			password: password,
			success: function(){
				$('#login').removeAttr("disabled");
				$('#login').text("登陆");
				$('.login-user').html(username);
				loginSuccess();
				var endTime = new Date();
				console.log('--- client login time --- '+ (endTime-beginTime));
			},
			fail: function(code, message){
				if(debug)
					console.info('user login fail, code: '+code+', message: '+message);
				$('#login').removeAttr("disabled");
				$('#login').text("登陆");
				switch (code){
					case 801003:
						$('#login-error-info').text('该用户名未注册');
						break;
					case 801004:
						$('#login-error-info').text('密码错误');
						break;
					case 872006:
						$('#login-error-info').text('登陆超时,正在重试...');
						setTimeout(login, 3000);
						break;
					default:
						$('#login-error-info').text('系统未知错误');
				}
			}
		});
 	} else {
 		setTimeout(login, 2000);
 	}
	
};

// 登陆成功处理
var loginSuccess = function(){
	showMsg('登陆成功');
	$('#multiLoginInfoPanel').css({"display": "none"});
	$('#loginPanel').css({"display": "none"});
	$('#content').css({"display": "block"});
	$('#username').val('');
	$('#password').val('');
	if(debug)
		console.info('user login success');
	var curUser = $('.login-user').text();
	JMessage.getUserInfo({
	   	username: curUser,
		success: function(response) {
			if(debug)
				console.info('userinfo: '+response);
			var respData = JSON.parse(response);
			addToIMContacts(respData);
		},
		fail: function(code, message){
			showErrorInfo(code);
			if(debug)
				console.error('getUserInfo fail, code: '+code+', message: '+message);
		}
	});
	loginStatus = true;
	createConversionlistUL();  //  创建会话列表
	JMessage.getGroupList({    //  获取群组列表
		  success: function(response) {
			  getGroupListSuccess(response);
		  },
		  fail: function(code, message){
		  	showErrorInfo(code);
		  	if(debug)
				console.log('user getGroupList fail, code: '+code+', message:'+message);
		  }
	});
};

// 获取群组成功处理
var getGroupListSuccess = function(response){
	if(debug)
		console.info('user getGroupList success');
	var data = JSON.parse(response);
	var length = data.length;
	createGroupListUL();
	for(var i=0; i<length; i++){
		var groupObject = data[i];
		var gid = groupObject.gid;
		var groupName = groupObject.groupName;
		IM.groups[gid] = groupObject;
		if('未命名'==groupName){
			var membersUsername = groupObject.membersUsername;
			var _groupName = membersUsername.slice(0,2).join(',');
			addGroupToList(gid, _groupName);
		} else {
			addGroupToList(gid, groupName);
		}
	}

	Ps.initialize(document.getElementById('contractlist'));
	Ps.initialize(document.getElementById('conversionlist'));
};

var addGroupToList = function(gid, groupName) {
	var uielem = document.getElementById("grouplistUL");
	var lielem = document.createElement("li");
	$(lielem).attr({
		'id' : gid,
		'chat' : 'chat',
		'onclick' : 'chooseGroupDivClick(this)',
		'displayName' : groupName,
	});
	var imgelem = document.createElement("img");
	imgelem.setAttribute("src", "./img/icon/home_18.png");
	imgelem.setAttribute("style", "margin-left:10px;");
	imgelem.setAttribute("class", "img-circle");
	lielem.appendChild(imgelem);
	var spanelem = document.createElement("span");
	$(spanelem).attr({
		"class" : "contractor-display-style"
	});
	spanelem.innerHTML = groupName;
	lielem.appendChild(spanelem);
	uielem.appendChild(lielem);

	var grouplist = document.getElementById('grouplist');
	var children = grouplist.children;
	if (children.length > 0) {
		grouplist.removeChild(children[0]);
	}
	grouplist.appendChild(uielem);
};

var closeModal = function(){
	$(".modalDialog").css({"display": "none"});
	$(".originImgModalDialog").css({"display": "none"});
};

var closeStartNewChatModal = function(){
	closeModal();
	if($('.start-new-chat-decoration').css('display')=='block'){
		$('.start-new-chat-decoration').css({"display":"none"});
	}
	if($('.add-new-groupmember-decoration').css('display')=='block'){
		$('.add-new-groupmember-decoration').css({"display":"none"});
	}
	var divList = $('.start-new-chat-list-div div')
	for(var i=0; i<divList.length; i++){
		$(divList[i]).remove();
	}
};

var closeAddNewGroupMemberModal = function(){
	closeModal();
	if($('.start-new-chat-decoration').css('display')=='block'){
		$('.start-new-chat-decoration').css({"display":"none"});
	}
	if($('.add-new-groupmember-decoration').css('display')=='block'){
		$('.add-new-groupmember-decoration').css({"display":"none"});
	}
	var divList = $('.add-new-group-member-list-div div')
	for(var i=0; i<divList.length; i++){
		$(divList[i]).remove();
	}
};

var toggleGroupList = function(){
	$('#grouplistUL').slideToggle();
};

var showRegPanel = function(){
	$('#loginPanel').css({
		"display": "none"
	});
	$('#registerPanel').css({
		"display": "block"
	});
};
var showLoginPanel = function(){
	$('#loginPanel').css({
		"display": "block"
	});
	$('#registerPanel').css({
		"display": "none"
	});
};

$(document).ready(function(){
	$('.left-func-img').click(function(e){
		e.stopPropagation();
		$(".func-ul").removeClass("hide");
	});
	$(document).click(function(){
	   	if(!$(".func-ul").hasClass("hide")){
			$(".func-ul").addClass("hide");
		}
	}); 
});

// 左边栏仿tab处理
var showConversionTab = function(){
	$('#conversionlist').fadeIn('normal');
	$('#contractlist').css({"display": "none"});
	$('#conversionTab').addClass('conversion-tab-visited');
	if ($('#contractsTab').hasClass('contract-tab-visited')) {
		$('#contractsTab').removeClass('contract-tab-visited');
		$('#contractsTab').addClass('contract-tab');
	}
};

var showContractsTab = function(){
	$('#contractlist').fadeIn('normal');
	$('#conversionlist').css({"display": "none"});
	$('#contractsTab').addClass('contract-tab-visited');
	if ($('#conversionTab').hasClass('conversion-tab-visited')) {
		$('#conversionTab').removeClass('conversion-tab-visited');
		$('#conversionTab').addClass('conversion-tab');
	}
};

// 点击选择群列表中的群后的操作
var chooseGroupDivClick = function(li) {
	var chatGroupId = li.id;
	var groupName = $('li#'+chatGroupId).attr('displayName');
	$('#tId').text(chatGroupId);
	$('#tName').text(groupName);
	$('#startChatModal').css({
		"display": "block"
	});
	//curChatGroupId = Number(chatGroupId);
	JMessage.getGroupInfo({
	 	groupId: curChatGroupId,
	  	success: function(response) {
	  		var respData = JSON.parse(response);
	  		updateGroupNameInConversionList(respData.gid, respData.groupName);
			resolveGroupInfoToDataCache(respData);
	  	},
	 	fail: function(code, message){
	 		showErrorInfo(code);
	 		if(debug)
		 		console.error('getGroupInfo fail, code: '+code+', message:'+message);
	  	}
	});
};

var startNewConversion = function(){
	var chatGroupId = $('#tId').text();
	var groupName = $('#tName').text();
	$('#talkInputId').focus();
	$('.'+talkToDiv).html(groupName);
	addGroupToConversionList(chatGroupId, groupName);
	changeLeftBordeActiveColor("li#conversion-"+chatGroupId);
	var indexPos = chatGroupId.indexOf("conversion");
	if(indexPos!=-1){
		chatGroupId = li.id.split('-')[1];
	}
	if ((chatGroupId != curChatGroupId)) {
		if (curChatGroupId == null) {
			createGroupChatDiv(chatGroupId);
			showGroupChatDiv(chatGroupId);
		} else {
			showGroupChatDiv(chatGroupId);
			hiddenGroupChatDiv(curChatGroupId);
		}
	} else {
		showGroupChatDiv(chatGroupId);
	}
	$('#null-page').css({"display" : "none"});
	if(curChatUserId != null){
		hiddenContactChatDiv(curChatUserId);
	}
	curChatGroupId = chatGroupId;
	isSingleOrGroup = "group";
	showConversionTab();
	$('#startChatModal').css({
		"display": "none"
	});
};

var startNewSingleChatConversion = function(){
	var chatUserId = $('#cName').text();
	$('.'+talkToDiv).html(chatUserId);
	addContractToConversionList(chatUserId, chatUserId);
	changeLeftBordeActiveColor("li#conversion-"+chatUserId);
	$('#talkInputId').focus();
	if ((chatUserId != curChatUserId)) {
		if (curChatUserId == null) {
			createContactChatDiv(chatUserId);
			showContactChatDiv(chatUserId);
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
	isSingleOrGroup = "single";
	showConversionTab();
	$('#contractorInfoModal').css({"display": "none"});
	hideGroupInfoPanel();
};

//  创建一个联系人聊天窗口
var createContactChatDiv = function(chatUserId) {
	var msgContentDivId = "div"+chatUserId;
	var newContent = document.createElement("div");
	newContent.setAttribute("id", msgContentDivId);
	newContent.setAttribute("class", "chat01_content");
	newContent.setAttribute("className", "chat01_content");
	newContent.setAttribute("style", "display:none");
	return newContent;
};

// 创建一个群组聊天窗口
var createGroupChatDiv = function(chatGroupId) {
	var msgContentDivId = "div"+chatGroupId;
	var newContent = document.createElement("div");
	newContent.setAttribute("id", msgContentDivId);
	newContent.setAttribute("class", "chat01_content");
	newContent.setAttribute("className", "chat01_content");
	newContent.setAttribute("style", "display:none");
	return newContent;
};

// 显示群组的聊天窗口
var showGroupChatDiv = function(chatGroupId) {
	var contentDiv = getGroupChatDiv(chatGroupId);
	if (contentDiv == null) {
		contentDiv = createGroupChatDiv(chatGroupId);
		document.getElementById(msgCardDivId).appendChild(contentDiv);
	}
	contentDiv.style.display = "block";
	var contactLi = document.getElementById(chatGroupId);
	var conversionLi = document.getElementById('conversion-'+chatGroupId);
	if(contactLi==null){
		return;
	}
	var group_name = $('li#'+chatGroupId).attr("displayName");
	$('.'+talkToDiv).html(group_name);
	//Ps.initialize(document.getElementById("div"+chatGroupId));
};

// 切换联系人聊天窗口div
var showSingleChat = function(li) {
	if(isNeedUpdateGroupName){
		backToChat();
		isNeedUpdateGroupName = false;
	}
	$(li).css({"border-left": "6px solid #4081df"});
	$('#talkInputId').focus();
	var chatUserId = li.id.split('-')[1];
	hideUnreadMsgMark(chatUserId);
	if($('#groupInfo').css('display')=='block'){
		hideGroupInfoPanel();
	}
	if ((chatUserId != curChatUserId)) {
		if (curChatUserId == null) {
			createContactChatDiv(chatUserId);
			showContactChatDiv(chatUserId);
		} else {
			showContactChatDiv(chatUserId);
			hiddenContactChatDiv(curChatUserId);
		}
	} else {
		showContactChatDiv(chatUserId);
	}
	$('#null-page').css({"display" : "none"});
	if(curChatGroupId != null){
		hiddenGroupChatDiv(curChatGroupId);
	}
	curChatUserId = chatUserId;
	isSingleOrGroup = "single";
	var name = $('#'+li.id).attr('username');
	var nickname = $('#'+li.id+' .contractor-display-style').text();
	$('.'+talkToDiv).html(nickname);

	var msgContentDiv = getGroupChatDiv(chatUserId);
	msgContentDiv.scrollTop = msgContentDiv.scrollHeight;

	var path;
	JMessage.getUserInfo({
	   	username: curChatUserId,
		success: function(response) {
			if(debug)
				console.info('userinfo: '+response);
			var respData = JSON.parse(response);
			addToIMContacts(respData);
			var name = respData.username;
			updateUsernameToNickname(name, respData.nickname);
			var mediaId = respData.avatar;
			if(mediaId!=undefined) {
				var mediaStrs = mediaId.split('/');
				if('qiniu'==mediaStrs[0]){
					path = JMessage.QiNiuMediaUrl + mediaId + '?imageView2/1/w/38/h/38';
				} else if('upyun'==mediaStrs[0]){
					path = JMessage.UpYunImageMediaUrl + mediaId +"!webavatar38";
				}
			}
			$('li#conversion-'+name+' img:eq(0)').attr('src', path);
			$('#div'+name+' img.left-avatar').attr('src', path);
			$('img[id=group-chat-'+name+']').each(function(){
				$(this).attr('src', path);
			});
		},
		fail: function(code, message){
			showErrorInfo(code);
			if(debug)
				console.error('getUserInfo fail, code: '+code+', message: '+message);
		}
	});
};

var showGroupChat = function(li){
	if(isNeedUpdateGroupName){
		backToChat();
		isNeedUpdateGroupName = false;
	}
	$(li).css({"border-left": "6px solid #4081df"});
	if($('#groupInfo').css('display')=='block'){
		hideGroupInfoPanel();
	}
	$('#talkInputId').focus();
	var chatGroupId = li.id.split('-')[1];
	hideUnreadMsgMark(chatGroupId);
	if ((chatGroupId != curChatGroupId)) {
		if (curChatGroupId == null) {
			createGroupChatDiv(chatGroupId);
			showGroupChatDiv(chatGroupId);
		} else {
			showGroupChatDiv(chatGroupId);
			hiddenGroupChatDiv(curChatGroupId);
		}
	} else {
		showGroupChatDiv(chatGroupId);
	}
	$('#null-page').css({"display" : "none"});
	if(curChatUserId != null){
		hiddenContactChatDiv(curChatUserId);
	}
	curChatGroupId = chatGroupId;
	isSingleOrGroup = "group";
	//var name = $('#'+li.id).attr('username');
	var name = $('#'+li.id+' .contractor-display-style').text();
	$('.'+talkToDiv).html(name);

	var msgContentDiv = getGroupChatDiv(chatGroupId);
	msgContentDiv.scrollTop = msgContentDiv.scrollHeight;

	if(IM.beenRemovedGroups.hasOwnProperty(curChatGroupId)){
		$('.chat-group-button-div').css({'display':'none'});
	} else {
		$('.chat-group-button-div').css({'display':'inline-block'});
	}

	curChatGroupId = Number(curChatGroupId);
	JMessage.getGroupInfo({
	 	groupId: curChatGroupId,
	  	success: function(response) {
	  		var respData = JSON.parse(response);
	  		updateGroupNameInConversionList(respData.gid, respData.groupName);
			resolveGroupInfoToDataCache(respData);
	  	},
	 	fail: function(code, message){
	 		showErrorInfo(code);
	 		if(debug)
		 		console.error('getGroupInfo fail, code: '+code+', message:'+message);
	  	}
	});
};

var hideGroupInfoPanel = function(){
	$('#groupInfo').css({"display":"none"});
	$('#chat01').show();
	$('.chat02').show();
};

var changeLeftBordeActiveColor = function(id) {
	$(id).css({
		"border-left": "6px solid #4081df"
	});
};

var changeLeftBordeInActiveColor = function(id) {
	$(id).css({
		"border-left": "6px solid #c5cdd0"
	});
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
	if(contactLi == null){
		return;
	}
	var chatName = $('li#conversion-'+chatUserId).attr('username');
	$('.'+talkToDiv).html(chatName);
	//Ps.initialize(document.getElementById("div"+chatUserId));
};

// 对上一个群组的聊天窗口做隐藏处理
var hiddenGroupChatDiv = function(chatGroupId) {
	changeLeftBordeInActiveColor("li#conversion-"+chatGroupId);
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

var hiddenContactChatDiv = function(chatUserId) {
	changeLeftBordeInActiveColor("li#conversion-"+chatUserId);
	var contactLi = document.getElementById(chatUserId);
	var conversionLi = document.getElementById('conversion-'+chatUserId);
	if (contactLi) {
		contactLi.style.backgroundColor = "";
	}
	if(conversionLi){
		conversionLi.style.backgroundColor = "";
	}
	var contentDiv = getContactChatDiv(chatUserId);
	if (contentDiv) {
		contentDiv.style.display = "none";
	}
};

//  获取当前聊天记录的窗口div
var getContactChatDiv = function(chatUserId) {
	return document.getElementById("div" + chatUserId);
};

//  获取当前群组聊天记录的窗口
var getGroupChatDiv = function(chatGroupId) {
	return document.getElementById("div" + chatGroupId);
};

// 创建会话列表UI
var createConversionlistUL = function() {
	var uielem = document.createElement("ul");
	$(uielem).attr({
		"id" : "conversionlistUL",
		"class" : "listUL"
	});
	var contactlist = document.getElementById("conversionlist");
	contactlist.appendChild(uielem);
};

// 创建群组列表UI
var createGroupListUL = function() {
	var grouplistUL = document.getElementById("grouplistUL");
	if(grouplistUL==undefined){
		var uielem = document.createElement("ul");
		$(uielem).attr({
			"id" : "grouplistUL",
			"class" : "listUL"
		});
		var grouplist = document.getElementById("grouplist");
		grouplist.appendChild(uielem);
	} else {
		var ulist = $('#grouplistUL li');
		for(var i=0; i<ulist.length; i++){
			$(ulist[i]).remove();
		}
	}
};

var updateChatSessionTime = function(id){
	var cid = "div"+id;
	if(IM.session.hasOwnProperty(cid)){
		var lastTime = IM.session[cid];
		var nowTime = new Date().getTime();
		if((nowTime-lastTime)>300000){
			var message = getCurDateString();
			var lineDiv = document.createElement("div");
			var lineDivStyle = document.createAttribute("style");
			lineDivStyle.nodeValue = "margin: 0px 10px 6px 10px;";
			lineDiv.setAttributeNode(lineDivStyle);
			var eletext = "<p3 >" + message + "</p3>";
			var ele = $(eletext);
			ele[0].setAttribute("class", "chat-content-event");
			ele[0].setAttribute("className", "chat-content-event");
			ele[0].style.backgroundColor = "#E8EAED";
				
			for ( var j = 0; j < ele.length; j++) {
				lineDiv.appendChild(ele[j]);
			}
		
			var msgContentDiv = document.getElementById(cid);
			lineDiv.style.textAlign = "center";
			msgContentDiv.appendChild(lineDiv);	
			msgContentDiv.scrollTop = msgContentDiv.scrollHeight;
		}
		IM.session[cid] = nowTime;
	} else {
		var time = new Date().getTime();
		IM.session[cid] = time;
		var message = getCurDateString();
		var lineDiv = document.createElement("div");
		var lineDivStyle = document.createAttribute("style");
		lineDivStyle.nodeValue = "margin: 0px 10px 6px 10px;"; 
		lineDiv.setAttributeNode(lineDivStyle); 
		var eletext = "<p3 >" + message + "</p3>";
		var ele = $(eletext);
		ele[0].setAttribute("class", "chat-content-event");
		ele[0].setAttribute("className", "chat-content-event");
		ele[0].style.backgroundColor = "#E8EAED";
			
		for ( var j = 0; j < ele.length; j++) {
			lineDiv.appendChild(ele[j]);
		}
	
		var msgContentDiv = document.getElementById(cid);
		if(msgContentDiv!=undefined){
			lineDiv.style.textAlign = "center";
			msgContentDiv.appendChild(lineDiv);
			msgContentDiv.scrollTop = msgContentDiv.scrollHeight;
		}
	}
};

// 添加自己发送的聊天信息到显示面板
var appendMsgSendByMe = function(message, rid) {
	var lineDiv = document.createElement("div");
	var lineDivStyle = document.createAttribute("style");
	lineDivStyle.nodeValue = "margin: 0px 38px 20px 10px;";
	lineDiv.setAttributeNode(lineDivStyle);
	var msgStatusSpan = "<span id="+rid+" class='msgSendingStatus' onclick='resendFailtureMsg(this);'></span>";
	var msgStatusElem = $(msgStatusSpan)[0];
	lineDiv.appendChild(msgStatusElem);
	var eletext = "<p3 style='margin-right:20px; color:#ffffff; vertical-align:top;' >" + message + "</p3>";
	var ele = $(eletext);
	ele[0].setAttribute("class", "chat-content-p3");
	ele[0].setAttribute("className", "chat-content-p3");
	for ( var j = 0; j < ele.length; j++) {
		lineDiv.appendChild(ele[j]);
	}

	var path = getContactAvatar38($('.login-user').html());

	var imgelem = document.createElement("img");
	imgelem.setAttribute("src", path);
	imgelem.setAttribute("style", "border-radius: 50%;");
	imgelem.setAttribute("class", "img-circle right-avatar");
	lineDiv.appendChild(imgelem);

	var msgContentDiv;
	if(isSingleOrGroup=='single'){
		msgContentDiv = getContactChatDiv(curChatUserId);
		updatePositionInConversionList(curChatUserId);
	} else if(isSingleOrGroup=='group'){
		msgContentDiv = getGroupChatDiv(curChatGroupId);
		updatePositionInConversionList(curChatGroupId);
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
	return lineDiv;
}; 

//  回车键发送消息
function stopDefault(e) {  
    if(e && e.preventDefault) {  
    	e.preventDefault();  
    } else {  
    	window.event.returnValue = false;   
    }
    return false;
};

//  监听用户按键，处理回车键事件
document.onkeydown = function(event){
   var e = event || window.event || arguments.callee.caller.arguments[0];      
   if(loginStatus){
   	if(e && e.keyCode==27){  // esc
   		$('#originImgModal').css({"display":"none"});
   	}    
   	if(e && e.keyCode==13){   // Enter按键
	   	stopDefault(e);

	   	if($('#startNewChatModal').css('display')=='block') {
 			addUserToChatList();
 			return;	
	   	}
	   	if($('#addNewGroupMemberModal').css('display')=='block'){
	   		addUserToGroupMemberList();
	   		return;
	   	}

	   	var content = document.getElementById('talkInputId').value;
	   	var msgTime = getCurDateString();
	   	if(content!=''){
		   	if(isSingleOrGroup=='single'){
			  	updateConversionRectMsg(curChatUserId, content);  //  更新会话列表中最新的消息
			  	updateConversionRectMsgTime(curChatUserId, msgTime);
			  	updateChatSessionTime(curChatUserId);
			   	JMessage.sendTextMessage({
	   	    			targetId: curChatUserId,
	   	    			targetType: 'single',
	   	    			text: content,
	   	    			idGenerated: function(rid){
	   	    				console.info('receive rid callback: '+rid);
	   	    				appendMsgSendByMe(content, rid);
	   	    			},
		    			success: function(rid) {
		    				updateSendMsgSuccessStatus(rid);
		    				console.info('single message status feedback: '+rid+' success');
		    				if(debug)
			    				console.info('sendSingleMessage success');
            			},
		    			fail: function(code, message, rid){
		    				updateSendMsgFailtureStatus(rid);
		    				showErrorInfo(code);
		  	    			if(debug)
		  	    				console.error('sendsingleMessage fail, code: '+code+' ,message: '+message);
		    			}
        			});
		   	} else if(isSingleOrGroup=='group'){
		   		updateConversionRectMsg(curChatGroupId, content);  //  更新会话列表中最新的消息
		   		updateConversionRectMsgTime(curChatGroupId, msgTime);
		   		updateChatSessionTime(curChatGroupId);
		   		curChatGroupId = String(curChatGroupId);
			   	JMessage.sendTextMessage({
	   	    			targetId: curChatGroupId,
	   	    			targetType: 'group',
	   	    			text: content,
	   	    			idGenerated: function(rid) {
	   	    				console.info('receive rid callback: '+rid);
	   	    				appendMsgSendByMe(content, rid);
	   	    			},
		    			success: function(rid) {
		    				updateSendMsgSuccessStatus(rid);
		    				console.info('group message status feedback: '+rid+' success');
		    				if(debug)
			    				console.info('sendGroupMessage success');
            			},
		    			fail: function(code, message, rid) {
		    				updateSendMsgFailtureStatus(rid);
		    				showErrorInfo(code);
		  	    			if(debug)
		  	    				console.error('sendGroupMessage fail, code: '+code+' ,message: '+message);
		    			}
        			});
		   	}
	   	} else {
		   	return;
	   	}
	   	document.getElementById('talkInputId').value = '';
    	}
   } else {
   	if(e && e.keyCode==13){   // Enter按键
	   	stopDefault(e);
	   	login();
	}
   }
};

// resend failture message
var resendFailtureMsg = function(dom) {
	var rid = dom.id;
	JMessage.resendMessage({
		rid: rid,
		success: function(rid) {
			updateSendMsgSuccessStatus(rid);
			console.info('resend message status feedback: '+rid+' success');
           },
		fail: function(code, message, rid){
			updateSendMsgFailtureStatus(rid);
			showErrorInfo(code);
		  	if(debug)
		  		console.error('resend message fail, code: '+code+' ,message: '+message);
		}
	});
	$('span#'+rid).removeClass('msgSendingStatus');
	$('span#'+rid).removeClass('msgFailStatus');
	$('span#'+rid).addClass('msgSendingStatus');
}

var updateSendMsgSuccessStatus = function(rid) {
	$('span#'+rid).removeClass('msgSendingStatus');
	$('span#'+rid).removeClass('msgFailStatus');
	$('span#'+rid).addClass('msgSuccessStatus');
};

var updateSendMsgFailtureStatus = function(rid) {
	if($('span#'+rid).hasClass('msgSendingStatus')){
		$('span#'+rid).removeClass('msgSendingStatus');
		$('span#'+rid).removeClass('msgSuccessStatus');
		$('span#'+rid).addClass('msgFailStatus');
	}
};

//  用户发送消息
function sendText(){
	var content = document.getElementById('talkInputId').value;
	var msgTime = getCurDateString();
	if(content==''){
	  	return;
	}
     document.getElementById('talkInputId').value = '';
     if(isSingleOrGroup=='single'){
    		updateConversionRectMsg(curChatUserId, content);  //  更新会话列表中最新的消息
    		updateConversionRectMsgTime(curChatUserId, msgTime);
    		updateChatSessionTime(curChatUserId);
		JMessage.sendTextMessage({
	   		targetId: curChatUserId,
	   		targetType: 'single',
	   		text: content,
	   		idGenerated: function(rid){
	   	    		console.info('receive rid callback: '+rid);
	   	    		appendMsgSendByMe(content, rid);
	   	    	},
			success: function(rid) {
				updateSendMsgSuccessStatus(rid);
				console.info('single message status feedback: '+rid+' success');
				if(debug)
					console.info('sendSingleMessage success');
           	},
			fail: function(code, message, rid){
				updateSendMsgFailtureStatus(rid);
				showErrorInfo(code);
				if(debug)
					console.error('sendSingleMessage fail, code: '+code+' ,message: '+message);
			}
        	});
     } else if(isSingleOrGroup=='group'){
     		updateConversionRectMsg(curChatGroupId, content);  //  更新会话列表中最新的消息
     		updateConversionRectMsgTime(curChatGroupId, msgTime);
     		updateChatSessionTime(curChatGroupId);
     		curChatGroupId = String(curChatGroupId);
    		JMessage.sendTextMessage({
	   	  	targetId: curChatGroupId,
	   	  	targetType: 'group',
	   	    	text: content,
	   	    	idGenerated: function(rid){
	   	    		console.info('receive rid callback: '+rid);
	   	    		appendMsgSendByMe(content, rid);
	   	    	},
		    	success: function(rid) {
		    		updateSendMsgSuccessStatus(rid);
		    		console.info('group message status feedback: '+rid+' success');
		    		if(debug)
					console.info('sendGroupMessage success');
            	},
		    	fail: function(code, message, rid){
		    		updateSendMsgFailtureStatus(rid);
		    		showErrorInfo(code);
		  		if(debug)
		  			console.error('sendGroupMessage fail, code: '+code+' ,message: '+message);
		    	}
        	});
     }
};

var sendPic = function(){
	var msgTime = getCurDateString();
	if(isSingleOrGroup=='single'){
    		updateConversionRectMsg(curChatUserId, "【图片文件】"); 
    		updateConversionRectMsgTime(curChatUserId, msgTime);
    		updateChatSessionTime(curChatUserId);
		JMessage.sendImageMessage({
	   	    	targetId: curChatUserId,
	   	    	targetType: 'single',
	   	    	fileId: 'myfile',
	   	    	idGenerated: function(rid){
	   	    		console.info('receive rid callback: '+rid);
	   	    		appendPicMsgSendByMe(rid);
	   	    	},
		    	success: function(rid) {
		    		updateSendMsgSuccessStatus(rid);
		    		console.info('single image message status feedback: '+rid+' success');
		    		if(debug)
					console.info('sendSingleImageMessage success');
            	},
		    	fail: function(code, message, rid){
		    		updateSendMsgFailtureStatus(rid);
		    		showErrorInfo(code);
		  		if(debug)
		  			console.error('sendSingleImageMessage fail, code: '+code+' ,message: '+message);
		    	}
        	});
     } else if(isSingleOrGroup=='group'){
     		updateConversionRectMsg(curChatGroupId, "【图片文件】");
     		updateConversionRectMsgTime(curChatGroupId, msgTime);
     		updateChatSessionTime(curChatGroupId);
     		curChatGroupId = Number(curChatGroupId);
     		JMessage.sendImageMessage({
	     		targetId: curChatGroupId,
	     		targetType: 'group',
	     		fileId: 'myfile',
	     		idGenerated: function(rid){
	   	    		console.info('receive rid callback: '+rid);
	   	    		appendPicMsgSendByMe(rid);
	   	    	},
	     		success: function(rid) {
	     			updateSendMsgSuccessStatus(rid);
	     			console.info('group image message status feedback: '+rid+' success');
	     			if(debug)
	    				console.info('sendImageMessage success');
	  		},
	  		fail: function(code, message, rid){
	  			updateSendMsgFailtureStatus(rid);
	  			showErrorInfo(code);
	  			if(debug)
	  				console.error('sendImageMessage fail, code: '+code+' ,message: '+message);
	  		}
		});
     }
};

//  添加自己发送的图片消息到消息面板
var appendPicMsgSendByMe = function(rid) {
	var lineDiv = document.createElement("div");
	var lineDivStyle = document.createAttribute("style");
	lineDivStyle.nodeValue = "margin: 0px 38px 20px 10px;";
	lineDiv.setAttributeNode(lineDivStyle);
	var imgId = new Date().getTime();
	var msgStatusSpan = "<span id="+rid+" class='msgSendingStatus'></span>";
	var msgStatusElem = $(msgStatusSpan)[0];
	lineDiv.appendChild(msgStatusElem);
	var eletext = "<p3 style='margin-right:6px; vertical-align:top; background:#F1F5F8;'><img id='" +imgId+"' class='img-preview' /></p3>";
	var ele = $(eletext);
	ele[0].setAttribute("class", "chat-content-p3");
	ele[0].setAttribute("className", "chat-content-p3");
	for ( var j = 0; j < ele.length; j++) {
		lineDiv.appendChild(ele[j]);
	}

	var path = getContactAvatar38($('.login-user').html());

	var imgelem = document.createElement("img");
	imgelem.setAttribute("src", path);
	imgelem.setAttribute("style", "border-radius: 50%;");
	imgelem.setAttribute("class", "img-circle right-avatar");
	lineDiv.appendChild(imgelem);
	
	var msgContentDiv;
	if(isSingleOrGroup=='single'){
		msgContentDiv = getContactChatDiv(curChatUserId); 
		updateConversionRectMsg(curChatUserId, "【图片文件】");
	} else if(isSingleOrGroup=='group'){
		msgContentDiv = getGroupChatDiv(curChatGroupId);
		updateConversionRectMsg(curChatGroupId, "【图片文件】");
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
	previewImg("myfile", imgId);
	return lineDiv;
};

/*********  image preview *********/
function previewImg(file, imgId) { 
	var newPreview = document.getElementById(imgId); 
	var obj = document.getElementById(file);
	if (obj) { 
		//ie 
		if (window.navigator.userAgent.indexOf("MSIE") >= 1) { 
			obj.select(); 
			newPreview.style.filter = "progid:DXImageTransform.Microsoft.AlphaImageLoader(sizingMethod=scale);"; 
			newPreview.filters.item("DXImageTransform.Microsoft.AlphaImageLoader").src = document.selection.createRange().text; 
			return; 
		} 
		//firefox
		else if (window.navigator.userAgent.indexOf("Firefox") >= 1) { 
			if (obj.files) {
				newPreview.src = window.URL.createObjectURL(obj.files.item(0)); 
				return; 
			} 
			newPreview.src = obj.value; 
			return;
		} else if(window.FileReader){
			var reader  = new FileReader();
			reader.onloadend = function () {
				newPreview.src = reader.result;
			}
			var file = obj.files[0];
			if (file) {
				reader.readAsDataURL(file);
			}
                return;
  		}
		newPreview.src = obj.value; 
		return; 
	} 
}
/********  image preview *********/

// update groupname in conversion list
var updateGroupNameInConversionList = function(id, name){
	var dom = $('#conversion-'+id);
	dom.attr('username', name);
	dom.attr('displayname', name);
	var gDom = $('#grouplistUL li#'+id);
	gDom.attr('displayname', name);
	if('未命名'==name){
		name = IM.groups[id].membersUsername.slice(0,2).join(',');
	}
	$('#grouplistUL li#'+id+' .contractor-display-style').text(name);
	$('#conversion-'+id+' .contractor-display-style').text(name);
	if(isSingleOrGroup=='group'&&curChatGroupId==id){
		$('.'+talkToDiv).html(name);
	}
};

//  添加群聊会话到会话列表中
var addGroupToConversionList = function(id ,name){
	var length = $("#conversionlistUL li").length;
	for(var i=0; i<length; i++){  //  检查是否添加重复项
		 var lielem = $("#conversionlistUL li")[i];
		 var lid = $(lielem).attr('id');
		 if(lid=='conversion-'+id)
			 return;
	}
	
	var uielem = document.getElementById("conversionlistUL");
	var newId = 'conversion-'+id;
	var lielem = document.createElement("li");
	$(lielem).attr({
		'id' : newId,
		'unreadcount' : 0,
		'username' : name,
		'onclick': 'showGroupChat(this)',
		'displayName' : name
	});
	var imgelem = document.createElement("img");
	imgelem.setAttribute("src", "./img/icon/home_18.png");
	imgelem.setAttribute("style", "margin-left:10px; position:relative; top:7px;");
	imgelem.setAttribute("class", "img-circle");
	
	var unreadelem = document.createElement("span");
	unreadelem.setAttribute("class", "badge");
	unreadelem.setAttribute("id", "badge-"+id);
	unreadelem.setAttribute("style", "visibility:hidden");
	lielem.appendChild(imgelem);
	lielem.appendChild(unreadelem);

	var spanelem = document.createElement("span");
	$(spanelem).attr({
		"class" : "contractor-display-style"
	});
	if('未命名'==name){
		name = IM.groups[id].membersUsername.slice(0,2).join(',');
	}
	spanelem.innerHTML = name;

	var timeelem = document.createElement("span");
	$(timeelem).attr({
		'id' : id+'-msg-time',
		"class" : "msg-time-span"
	});
	
	lielem.appendChild(spanelem);
	lielem.appendChild(timeelem);
	uielem.appendChild(lielem);
	
	//  添加显示最近的消息
	var recr_msg_elem = document.createElement("span");
	$(recr_msg_elem).attr({
		'id' : id+'-rect-msg',
		"class" : "rect-msg-display-style"
	});
	$('#'+newId).append(recr_msg_elem);
}

//   添加对方发送的聊天信息到显示面板
var appendMsgSendByOthers = function(name, nickname, message, create_time, chattype, contentType, c_uid){
	var msg_time = parseToLocalDateString(new Date(create_time*1000));
	if(chattype=='single'){
		var contactDivId = name;
		var contactLi = getContactLi('conversion-'+contactDivId);
		if(contactLi==null){
			addContractToConversionList(contactDivId, name);
			contactLi = getContactLi('conversion-'+contactDivId);
		}
		var path = getContactAvatar38(contactDivId);

		var lineDiv = document.createElement("div");
		var lineDivStyle = document.createAttribute("style");
		lineDivStyle.nodeValue = "margin: 0px 10px 20px 38px;";
		lineDiv.setAttributeNode(lineDivStyle);
		var imgelem = document.createElement("img");
		imgelem.setAttribute("src", path);
		imgelem.setAttribute("style", "border-radius: 50%;");
		imgelem.setAttribute("class", "img-circle left-avatar");
		lineDiv.appendChild(imgelem);

		var ele;
		if('text'==contentType){
			var content = message.text;
			var eletext = "<p3 style='margin-left:6px; vertical-align:top; color:#262626;'>" + content + "</p3>";
			ele = $(eletext);
			ele[0].setAttribute("class", "chat-content-p3");
			ele[0].setAttribute("className", "chat-content-p3");
			ele[0].style.backgroundColor = "#D7E0E7";
			updateConversionRectMsg(contactDivId, content);  //  更新会话列表中最新的消息
			updateConversionRectMsgTime(contactDivId, msg_time);
		} else if('image'==contentType){
			var mediaId = message.media_id;
			var width = message.width;
			var height = message.height;
			var path = '';
			var mediaStrs = mediaId.split('/');
			if('qiniu'==mediaStrs[0]){
				path = JMessage.QiNiuMediaUrl + mediaId + '?imageView2/0/w/200/h/200';
			} else if('upyun'==mediaStrs[0]){
				path = JMessage.UpYunImageMediaUrl + mediaId +"!webpic";
			}
			if(height<=400&&width<=400){
				if('qiniu'==mediaStrs[0]){
					path = JMessage.QiNiuMediaUrl + mediaId;
				} else if('upyun'==mediaStrs[0]){
					path = JMessage.UpYunImageMediaUrl + mediaId;
				}
			} 
			if(width>=400&&height<=400){
				var ratio = height/width;
				width = 200;
				height = 200*ratio;
			}
			if(width<=400&&height>=400){
				var ratio = width/height;
				height = 200;
				width = 200*ratio;
			}
			if(width>=400&&height>=400){
				if(width<=height){
					var ratio = width/height;
					height = 200;
					width = 200*ratio;
				} else {
					var ratio = height/width;
					width = 200;
					height = 200*ratio;
				}
			}
			message = "<img onclick='showOriginImg(this)' src="+path+" width='"+width+"px;' height='"+height+"px; '></img>";
			var eletext = "<p3 style='margin-left:6px; vertical-align:top; '>" + message + "</p3>";
			ele = $(eletext);
			ele[0].setAttribute("class", "chat-content-pic");
			ele[0].setAttribute("className", "chat-content-pic");
			updateConversionRectMsg(contactDivId, "【图片文件】");  //  更新会话列表中最新的消息
			updateConversionRectMsgTime(contactDivId, msg_time);
		} else if('voice'==contentType){
			var messageObject = message;
			var mediaId = messageObject.media_id;
			var duration = messageObject.duration;
			var mediaIds = mediaId.split('/');
			var path = "";
			if('qiniu'==mediaIds[0]){
				path = JMessage.QiNiuMediaUrl + mediaId +'.mp3';
			} else if('upyun'==mediaIds[0]){
				path = JMessage.UpYunVoiceMediaUrl + mediaId +'.mp3';
			}
			message = "<audio src=" + path +" controls='controls' width='40px' height='20px' style='visibility:hidden;'>"+
							+	"Your browser does not support the audio element."+
							+ "</audio>";
			var eletext = "<p3 style='margin-left:18px; vertical-align:top;' onclick='playAudio(this);'>" + message + "</p3>";
			ele = $(eletext);
			ele[0].setAttribute("class", "chat-content-voice");
			ele[0].setAttribute("className", "chat-content-voice");
			ele[0].style.backgroundColor = "#D7E0E7";
			updateConversionRectMsg(contactDivId, "【语音文件】");  //  更新会话列表中最新的消息
			updateConversionRectMsgTime(contactDivId, msg_time);
		}
		
		for ( var j = 0; j < ele.length; j++) {
			lineDiv.appendChild(ele[j]);
		}

		if(curChatUserId==null){
			showUnreadMsgMark(contactDivId);
		} else {
			if (isSingleOrGroup=='single') {
				if(contactDivId!=curChatUserId){
					showUnreadMsgMark(contactDivId);
				}
			} else {
				showUnreadMsgMark(contactDivId);
			}
		}
			 
		var msgContentDiv = getContactChatDiv(contactDivId);
		lineDiv.style.textAlign = "left";
		
		var create = false;
		if (msgContentDiv == null) {
			msgContentDiv = createContactChatDiv(contactDivId);
			create = true;
		}

		if (nickname!=''&&nickname!=undefined) {
			updateUsernameToNickname(name, nickname);
		};
		updateChatSessionTime(contactDivId);
		updatePositionInConversionList(name);
		msgContentDiv.appendChild(lineDiv);
		if (create) {
			document.getElementById(msgCardDivId).appendChild(msgContentDiv);
		}
		msgContentDiv.scrollTop = msgContentDiv.scrollHeight;
		return lineDiv;
	}
	if(chattype=='group'){
		var contactDivId = c_uid;
		var contactLi = getContactLi('conversion-'+c_uid);
		var groupName = $('li#'+c_uid).attr('displayname');
		if(contactLi==null||contactLi==undefined){
			if(groupName==null||groupName==undefined){
				if(IM.groups[c_uid]){
					addGroupToConversionList(c_uid, IM.groups[c_uid].groupName);
				} else {
					addGroupToConversionList(c_uid, c_uid);
					var groupid = Number(c_uid);
					JMessage.getGroupInfo({
					 	groupId: groupid,
					  	success: function(response) {
					  		if(debug)
					  	  		console.info('..getGroupInfo success: '+response);
					  	  	var respData = JSON.parse(response);
					  	  	updateGroupNameInConversionList(respData.gid, respData.groupName);
					  	  	resolveGroupInfoToDataCache(respData);
					  	},
					 	fail: function(code, message){
					 		showErrorInfo(code);
						  	if(debug)
						  		console.error('getGroupInfo fail, code: '+code+', message: '+message);
					  	}
					});
				}
			} else {
				addGroupToConversionList(c_uid, groupName);
				contactLi = getContactLi('conversion-'+c_uid);
			}
		}
		var path = getContactAvatar38(name);

		var lineDiv = document.createElement("div");
		var lineDivStyle = document.createAttribute("style");
		lineDivStyle.nodeValue = "margin: 0px 10px 20px 38px; padding-top:15px;";
		lineDiv.setAttributeNode(lineDivStyle);
		var imgelem = document.createElement("img");
		imgelem.setAttribute("src", path);
		imgelem.setAttribute("id", 'group-chat-'+name);
		imgelem.setAttribute("style", "border-radius: 50%;");
		imgelem.setAttribute("class", "img-circle left-avatar");
		var spanelem = document.createElement("span");
		spanelem.setAttribute("class", "group-chat-contact-display");
		spanelem.innerHTML = nickname;
		lineDiv.appendChild(imgelem);
		lineDiv.appendChild(spanelem);
			
		var ele;
		if('text'==contentType){
			var content = message.text;
			var eletext = "<p3 style='margin-left:6px; vertical-align:top; position:absolute; left:90px; color:#262626;'>" + content + "</p3>";
			ele = $(eletext);
			ele[0].setAttribute("class", "chat-content-p3");
			ele[0].setAttribute("className", "chat-content-p3");
			ele[0].style.backgroundColor = "#D7E0E7";
			updateConversionRectMsg(contactDivId, content);  //  更新会话列表中最新的消息
			updateConversionRectMsgTime(contactDivId, msg_time);
		} else if('image'==contentType){
			var mediaId = message.media_id;
			var width = message.width;
			var height = message.height;
			var path = '';
			var mediaStrs = mediaId.split('/');
			if('qiniu'==mediaStrs[0]){
				path = JMessage.QiNiuMediaUrl + mediaId + '?imageView2/0/w/200/h/200';
			} else if('upyun'==mediaStrs[0]){
				path = JMessage.UpYunImageMediaUrl + mediaId +"!webpic";
			}
			if(height<=400&&width<=400){
				if('qiniu'==mediaStrs[0]){
					path = JMessage.QiNiuMediaUrl + mediaId;
				} else if('upyun'==mediaStrs[0]){
					path = JMessage.UpYunImageMediaUrl + mediaId;
				}
			} 
			if(width>=400&&height<=400){
				var ratio = height/width;
				width = 200;
				height = 200*ratio;	
			}         
			if(width<=400&&height>=400){
				var ratio = width/height;
				height = 200;
				width = 200*ratio;
			}
			if(width>=400&&height>=400){
				if(width<=height){
					var ratio = width/height;
					height = 200;
					width = 200*ratio;
				} else {
					var ratio = height/width;
					width = 200;
					height = 200*ratio;
				}
			}
			message = "<img onclick='showOriginImg(this)' src="+path+" width='"+width+"px;' height='"+height+"px;'></img>";
			var eletext = "<p3 style='margin-left:6px; vertical-align:top; left:-30px;'>" + message + "</p3>";
			ele = $(eletext);
			ele[0].setAttribute("class", "chat-content-pic");
			ele[0].setAttribute("className", "chat-content-pic");
			updateConversionRectMsg(contactDivId, "【图片文件】");  //  更新会话列表中最新的消息
			updateConversionRectMsgTime(contactDivId, msg_time);
		} else if('voice'==contentType){
			var messageObject = message;
			var mediaId = messageObject.media_id;
			var duration = messageObject.duration;
			var mediaIds = mediaId.split('/');
			var path = "";
			if('qiniu'==mediaIds[0]){
				path = JMessage.QiNiuMediaUrl + mediaId + '.mp3';
			} else if('upyun'==mediaIds[0]){
				path = JMessage.UpYunVoiceMediaUrl + mediaId + '.mp3';
			}
			message = "<audio src=" + path +" controls='controls' width='40px' height='20px' style='visibility:hidden;'>"+
							+	"Your browser does not support the audio element."+
							+ "</audio>";
			var eletext = "<p3 style='margin-left:18px; vertical-align:top; left:-30px;' onclick='playAudio(this);'>" + message + "</p3>";
			ele = $(eletext);
			ele[0].setAttribute("class", "chat-content-voice");
			ele[0].setAttribute("className", "chat-content-voice");
			ele[0].style.backgroundColor = "#D7E0E7";
			updateConversionRectMsg(contactDivId, "【语音文件】");  //  更新会话列表中最新的消息
			updateConversionRectMsgTime(contactDivId, msg_time);
		}
		
		for ( var j = 0; j < ele.length; j++) {
			lineDiv.appendChild(ele[j]);
		}
		
		if(curChatGroupId==null||curChatGroupId==undefined){
			showUnreadMsgMark(contactDivId);
		} else {
			if (isSingleOrGroup=='group') {
				if(curChatGroupId!=contactDivId){
					showUnreadMsgMark(contactDivId);
				}
			} else {
				showUnreadMsgMark(contactDivId);
			}
		}
			 
		var msgContentDiv = getGroupChatDiv(contactDivId);
		lineDiv.style.textAlign = "left";
		
		var create = false;
		if (msgContentDiv == null) {
			msgContentDiv = createGroupChatDiv(contactDivId);
			create = true;
		}
		updateChatSessionTime(contactDivId);
		updatePositionInConversionList(contactDivId);
		msgContentDiv.appendChild(lineDiv);
		if (create) {
			document.getElementById(msgCardDivId).appendChild(msgContentDiv);
		}
		msgContentDiv.scrollTop = msgContentDiv.scrollHeight;
		return lineDiv;
	}
};

var updatePositionInConversionList = function(name){
	var li = $('#conversionlistUL #conversion-'+name);
	li.clone().prependTo("#conversionlistUL");
	li.remove();
};

var prePicPreview = function(){
	var id;
	if(isSingleOrGroup=='single'){
		id = "div"+curChatUserId;
	} else {
		id = "div"+curChatGroupId;
	}
	var curDiv = $('img[src="'+curPreviewPic+'"]').parents('div')[0];
	var preDiv = $(curDiv).prev();
	while(preDiv){
		var length = preDiv.children('p3.chat-content-pic').length;
		if(length==0) {
			preDiv = $(preDiv).prev();
			/*if(preDiv.length==0){
				return;
				alert('the first pic');
			}*/
		} else {
			break;
		}
	}
	var img = preDiv.children('p3.chat-content-pic').children('img');
	showOriginImg(img[0]);
};

var nextPicPreview = function(){
	var id;
	if(isSingleOrGroup=='single'){
		id = "div"+curChatUserId;
	} else {
		id = "div"+curChatGroupId;
	}
	var curDiv = $('img[src="'+curPreviewPic+'"]').parents('div')[0];
	console.log('pic : '+curPreviewPic);
	var preDiv = $(curDiv).next();
	while(preDiv){
		var length = preDiv.children('p3.chat-content-pic').length;
		if(length==0){
			preDiv = $(preDiv).next();
			/*if(preDiv.length==0){
				return;
				alert('the last pic');
			}*/
		} else {
			break;
		}
	}
	var img = preDiv.children('p3.chat-content-pic').children('img');
	showOriginImg(img[0]);
};

var getCurDateString = function(){
	var timeMark = '上午';
	var date = new Date();
	var hour = date.getHours();
	var minutes = date.getMinutes();
	minutes =  (date.getMinutes()<10?'0':'')+minutes;
	if(hour>12){
		timeMark = '下午';
		hour = hour-12;
	}
	var result = timeMark+' '+hour+':'+minutes+' '; 
	return result;
};

var parseToLocalDateString = function(date){
	var timeMark = '上午';
	var hour = date.getHours();
	var minutes = date.getMinutes();
	if(hour>12){
		timeMark = '下午';
		hour = hour-12;
	}
	var result = timeMark+' '+hour+':'+minutes+' '; 
	return result;
};

var resolveGroupInfoToDataCache = function(data){
	var members = data.members;
	var length = members.length;
	var membersUsernameArray = new Array();
	for(var i=0; i<length; i++){
		var username = members[i].username;
		IM.contacts[username] = members[i];
		membersUsernameArray.push(username);
	}
	var groupObject = {
		'gid': data.gid,
		'ownerUsername': data.ownerUsername,
		'groupName': data.groupName,
		'groupDesc': data.groupDesc,
		'membersUsername': membersUsernameArray
	};
	IM.groups[data.gid] = groupObject;
};

var audioIndex = 1;
var playAudio = function(dom){
	var audio = $(dom).children()[0];
	if(audio.paused){
		audio.play(audio.paused);
		var timer = setInterval(function(){
			if(audio.paused){
				clearInterval(timer);
				$(dom).css({
					"background":"url('./img/icon/audio/3.png') no-repeat scroll 20px center transparent",
					"background-color": "#D7E0E7"
				});
				return;
			}
			if(audioIndex>3){
				audioIndex = 1;
			} else {
				$(dom).css({
					"background":"url('./img/icon/audio/"+audioIndex+".png') no-repeat scroll 20px center transparent",
					"background-color": "#D7E0E7"
				});
				audioIndex++;
			}
		}, 500);
		return;
	}
	audio.pause();
};

// show event notification
var showEventNotification = function(data){
	var eventType = data.eventType;
	var gid = data.gid;
	var fromUser = data.fromUsername;
	var description = data.description;
	var toUserList = data.toUsernameList.join(',');
	var curUser = $('.login-user').text();
	var message = "";
	switch (eventType){
		case "add_members":  // 加入群聊
			message = fromUser+" 邀请 "+toUserList+" 加入群聊";
			if(IM.groups[gid]){
				IM.groups[gid].membersUsername.concat(data.toUsernameList);
			}
			for(var i in data.toUsernameList){
				if(curUser==data.toUsernameList[i]){
					delete IM.beenRemovedGroups[gid];
					break;
				}
			}
			break;
		case "remove_members":
			message = fromUser+" 将 "+toUserList+" 请出群聊";
			var length = data.toUsernameList.length;
			if(IM.groups[gid]){
				for(var i=0; i<length; i++){
					IM.groups[gid].membersUsername.remove(data.toUsernameList[i]);
				}
			}
			for(var i in data.toUsernameList){
				if(curUser==data.toUsernameList[i]){
					IM.beenRemovedGroups[gid] = curUser;
					break;
				}
			}
			break;
		case "create_group":
			message = fromUser+" 创建群";
			break;
		case "exit_group":
			message = fromUser+" 退出群聊";
			if('administrator delete group'==description){
				message = fromUser+" 删除该群";
			}
			break;
		default:
			if(debug)
				console.error('undefined eventType');
	}
	
	gid = "div"+gid;
	var id = $('#chat01 #'+gid).attr('id');
	if(id!=null||id!=undefined){
		var lineDiv = document.createElement("div");
		var lineDivStyle = document.createAttribute("style");
		lineDivStyle.nodeValue = "margin: 0px 10px 6px 10px;"; 
		lineDiv.setAttributeNode(lineDivStyle);
		var eletext = "<p3 >" + message + "</p3>";
		var ele = $(eletext);
		ele[0].setAttribute("class", "chat-content-event");
		ele[0].setAttribute("className", "chat-content-event");
		ele[0].style.backgroundColor = "#E8EAED";
		
		for ( var j = 0; j < ele.length; j++) {
			lineDiv.appendChild(ele[j]);
		}
				
		var msgContentDiv = document.getElementById(id);
		lineDiv.style.textAlign = "center";
		msgContentDiv.appendChild(lineDiv);
		msgContentDiv.scrollTop = msgContentDiv.scrollHeight;
	}
};

var showOriginImg = function(img){
	var src = img.src;
	curPreviewPic = src;
	var qiniuOriginSrc = src.split('?');
	var upyunOriginSrc = src.split('!');
	var picSrc;
	var infoSrc;
	if(qiniuOriginSrc.length>1){       // qiniu
		picSrc = src.split('?')[0];
		infoSrc = picSrc+'?imageInfo';
	} else if (upyunOriginSrc.length>1) {    // upyun
		picSrc = src.split('!')[0];
		infoSrc = picSrc+'!webpicinfo';
	} else {
		picSrc = src;
		if(src.indexOf('qiniu')>0){
			infoSrc = src+'?imageInfo';
		} else {
			infoSrc = src+'!webpicinfo';
		}
	}
	var screenHeight = window.screen.height-300;
	var screenWidth = window.screen.width-300;
	var picHeight;
	var picWidth;
	$.ajax({
		url: infoSrc,
		method: 'GET',
		dataType: 'json',
		success: function(data){
			picWidth = data.width;
			picHeight = data.height;
			if(picHeight>screenHeight||picWidth>screenWidth){
				if(picWidth>picHeight){
					var ratio = screenHeight/picHeight;
					picHeight = screenHeight;
					picWidth = picWidth*ratio; 
				} else {
					var ratio = screenWidth/picWidth;
					picWidth = screenWidth;
					picHeight = picHeight*ratio;
				}
				$('#originImg').attr('src', picSrc);
				$('#originImg').css({
					'width': picWidth,
					'height':  picHeight
				});
				$('#originImgModal').css({'display':'block'});
			} else {
				$('#originImg').attr('src', picSrc);
				$('#originImg').css({
					'width': picWidth,
					'height': picHeight
				});
				$('#originImgModal').css({'display':'block'});
			} 
		}
	});
};

var updateUsernameToNickname = function(username, nickname){
	if(nickname!=''&&nickname!=null&&nickname!=undefined){
		$('#conversionlist li#conversion-'+username+' .contractor-display-style').text(nickname);
	}
	if(isSingleOrGroup=='single'&&curChatUserId==username){
		$('.'+talkToDiv).html(nickname);
	}
	var list = $('img[id=group-chat-'+username+']');
	for(var i=0; i<list.length; i++){
		$(list[i]).next().text(nickname);
	}
};

var getContactAvatar38 = function(username){
	var path = "./img/icon/home_18.png";
	if(IM.contacts.hasOwnProperty(username)){
		var mediaId = IM.contacts[username].avatar;
		var nickname = IM.contacts[username].nickname;
		updateUsernameToNickname(username, nickname);
		if(mediaId!=undefined) {
			var mediaStrs = mediaId.split('/');
			if('qiniu'==mediaStrs[0]){
				path = JMessage.QiNiuMediaUrl + mediaId + '?imageView2/1/w/38/h/38';
			} else if('upyun'==mediaStrs[0]){
				path = JMessage.UpYunImageMediaUrl + mediaId +"!webavatar38";
			}
		}
	} else {
		JMessage.getUserInfo({
		   	username: username,
			success: function(response) {
				if(debug)
					console.info('userinfo: '+response);
				var respData = JSON.parse(response);
				addToIMContacts(respData);
				updateUsernameToNickname(respData.username, respData.nickname);
				var mediaId = respData.avatar;
				if(mediaId!=undefined) {
					var mediaStrs = mediaId.split('/');
					if('qiniu'==mediaStrs[0]){
						path = JMessage.QiNiuMediaUrl + mediaId + '?imageView2/1/w/38/h/38';
					} else if('upyun'==mediaStrs[0]){
						path = JMessage.UpYunImageMediaUrl + mediaId +"!webavatar38";
					}
				}
				$('li#conversion-'+username+' img:eq(0)').attr('src', path);
				$('#div'+username+' img.left-avatar').attr('src', path);
				$('img[id=group-chat-'+username+']').each(function(){
					$(this).attr('src', path);
				});
			},
			fail: function(code, message){
				showErrorInfo(code);
				if(debug)
					console.error('getUserInfo fail, code: '+code+', message: '+message);
			}
		});
	}
	return path;
}

var getContactAvatar100 = function(username){
	var path = "./img/icon/home_19.png";
	if(IM.contacts.hasOwnProperty(username)){
		var mediaId = IM.contacts[username].avatar;
		if(mediaId!=undefined) {
			var mediaStrs = mediaId.split('/');
			if('qiniu'==mediaStrs[0]){
				path = JMessage.QiNiuMediaUrl + mediaId + '?imageView2/1/w/100/h/100';
			} else if('upyun'==mediaStrs[0]){
				path = JMessage.UpYunImageMediaUrl + mediaId +"!webavatar100";
			}
			$('ul#groupMemberInfoListUL li#'+username+' img.group-member-avator').attr('src', path);
		} else {
			$('ul#groupMemberInfoListUL li#'+username+' img.group-member-avator').attr('src', path);
		}
	} else {
		JMessage.getUserInfo({
		   	username: username,
			success: function(response) {
				if(debug)
					console.info('userinfo: '+response);
				var respData = JSON.parse(response);
				addToIMContacts(respData);
				var mediaId = respData.avatar;
				if(mediaId!=undefined) {
					var mediaStrs = mediaId.split('/');
					var avatarSrc;
					var avatar38;
					if('qiniu'==mediaStrs[0]){
						avatarSrc = JMessage.QiNiuMediaUrl + mediaId + '?imageView2/1/w/100/h/100';
						avatar38 = JMessage.QiNiuMediaUrl + mediaId + '?imageView2/1/w/38/h/38';
					} else if('upyun'==mediaStrs[0]){
						avatarSrc = JMessage.UpYunImageMediaUrl + mediaId +"!webavatar100";
						avatar38 = JMessage.UpYunImageMediaUrl + mediaId +"!webavatar38";
					}
					$('ul#groupMemberInfoListUL li#'+respData.username+' img.group-member-avator').attr('src', avatarSrc);
					$('li#conversion-'+username+' img:eq(0)').attr('src', avatar38);
					$('#div'+username+' img.left-avatar').attr('src', avatar38);
					$('img[id=group-chat-'+username+']').each(function(){
						$(this).attr('src', avatar38);
					});
				} else {
					$('ul#groupMemberInfoListUL li#'+respData.username+' img.group-member-avator').attr('src', path);
				}
			},
			fail: function(code, message){
				showErrorInfo(code);
				if(debug)
					console.error('getUserInfo fail, code: '+code+', message: '+message);
			}
		});
	}
	return path;
};

//   添加单聊会话到会话列表中
var addContractToConversionList = function(id ,name){ 
	var length = $("#conversionlistUL li").length;
	for(var i=0; i<length; i++){  //  检查是否添加重复项
		 var lielem = $("#conversionlistUL li")[i];
		 var lid = $(lielem).attr('id');
		 if(lid=='conversion-'+id)
			 return;
	}

	var path = getContactAvatar38(name);

	var uielem = document.getElementById("conversionlistUL");
	var newId = 'conversion-'+id;
	var lielem = document.createElement("li");
	$(lielem).attr({
		'id' : newId,
		'unreadcount' : 0,
		'username' : name,
		'onclick': 'showSingleChat(this)',
		'displayName' : name
	});
	var imgelem = document.createElement("img");
	imgelem.setAttribute("src", path);
	imgelem.setAttribute("style", "margin-left:10px; position:relative; top:7px;");
	imgelem.setAttribute("class", "img-circle");
	imgelem.setAttribute("onclick", "showDetailInfo(this)");
	
	var unreadelem = document.createElement("span");
	unreadelem.setAttribute("class", "badge");
	unreadelem.setAttribute("id", "badge-"+id);
	unreadelem.setAttribute("style", "visibility:hidden");
	lielem.appendChild(imgelem);
	lielem.appendChild(unreadelem);

	var spanelem = document.createElement("span");
	$(spanelem).attr({
		"class" : "contractor-display-style"
	});
	spanelem.innerHTML = name;

	var timeelem = document.createElement("span");
	$(timeelem).attr({
		'id' : id+'-msg-time',
		"class" : "msg-time-span"
	});
	
	lielem.appendChild(spanelem);
	lielem.appendChild(timeelem);
	uielem.appendChild(lielem);
	
	//  添加显示最近的消息
	var recr_msg_elem = document.createElement("span");
	$(recr_msg_elem).attr({
		'id' : id+'-rect-msg',
		"class" : "rect-msg-display-style"
	});
	$('#'+newId).append(recr_msg_elem);
};

//  更新会话列表中的最近消息状态
var updateConversionRectMsg = function(id, msg){
	$('#'+id+'-rect-msg').html(msg);
} 

var updateConversionRectMsgTime = function(id, time){
	$('#'+id+'-msg-time').html(time);
} 

var showGroupInfo = function(){
	var memberList = $('ul#groupMemberInfoListUL li');
	for(var i=0; i<memberList.length-1; i++){
		$(memberList[i]).remove();
	}
	$('.chat02').fadeOut(100);
	$('#chat01').fadeOut(100);
	$('#groupInfo').delay(100).fadeIn();
	if(isSingleOrGroup=='group'){
		isNeedUpdateGroupName = true;
		$('#groupMemberInfoPanel p.input-decoration').css({"visibility":"visible"});
		$('#groupMemberInfoPanel .form-inline').css({"visibility":"visible"});
		//tmpGroupName = $.trim($('#'+curChatGroupId).attr('displayname'));
		tmpGroupName = IM.groups[curChatGroupId].groupName;
		var groupId = Number(curChatGroupId);
		getAndRenderGroupMemberList(groupId);
		$('#group_info_groupname').val(tmpGroupName);
	} else {
		var memberList = $('ul#groupMemberInfoListUL li');
		for(var i=0; i<memberList.length-1; i++){
			$(memberList[i]).remove();
		}
		$('#groupMemberInfoPanel p.input-decoration').css({"visibility":"hidden"});
		$('#groupMemberInfoPanel .form-inline').css({"visibility":"hidden"});
	}
};

var getAndRenderGroupMemberList = function(groupId){
	var memberList = $('ul#groupMemberInfoListUL li');
	for(var i=0; i<memberList.length-1; i++){
		$(memberList[i]).remove();
	}
	if(IM.groups.hasOwnProperty(groupId)){
		var memberList = IM.groups[groupId].membersUsername;
		var groupOwner = IM.groups[groupId].ownerUsername;
		var curUser = $('.login-user').text();
		var length = memberList.length;
		for(var i=0; i<length; i++){
			var username = memberList[i];
			var nickname = username;
			if(IM.contacts.hasOwnProperty(username)){
				var cacheNickname = IM.contacts[username].nickname;
				if(cacheNickname!=''&&cacheNickname!=null&&cacheNickname!=undefined){
					nickname = cacheNickname;
				}
			}
			var ele;
			if(curUser==groupOwner){
				ele = "<li id="+ username + " onmouseover='showDelMemMark(this);' onmouseout='hideDelMemMark(this);' >" +
					"<img id="+ username +" class='del-mark' src='./img/icon/home_24.png' onclick='delGroupMember(this);' />" +
					"<img id="+ username +" onclick='showMemberInfo(this);' class='group-member-avator img-circle' src='./img/icon/home_19.png'/>" +
					"<p class='profileName'>"+ nickname +"</p></li>";
			} else {
				ele = "<li id="+ username + " onmouseover='showDelMemMark(this);' onmouseout='hideDelMemMark(this);' >" +
					"<img id="+ username +" />" +
					"<img id="+ username +" onclick='showMemberInfo(this);' class='group-member-avator img-circle' src='./img/icon/home_19.png'/>" +
					"<p class='profileName'>"+ nickname +"</p></li>";
			}
			$('#addNewMember').before(ele);
			$('#groupMemberInfoListUL li#'+curUser+' img.del-mark').remove();
			var avatarPath = getContactAvatar100(username);
		}
	}
	JMessage.getGroupInfo({
	 	groupId: groupId,
	  	success: function(response) {
	  		var respData = JSON.parse(response);
	  		resolveGroupInfoToDataCache(respData);
	  		updateGroupNameInConversionList(respData.gid, respData.groupName);
	  		var data = respData.members;
	  		var groupOwner = respData.ownerUsername;
			var curUser = $('.login-user').text();
	  		var memberList = $('#groupMemberInfoListUL li');
			for(var i=0; i<memberList.length-1; i++){
				$(memberList[i]).remove();
			}
			var length = data.length;
			for(var i=0; i<length; i++){
				var username = data[i].username;
				addToIMContacts(data[i]);
				var ele;
				if(curUser==groupOwner){
					ele = "<li id="+ username + " onmouseover='showDelMemMark(this);' onmouseout='hideDelMemMark(this);' >" +
						"<img id="+ username +" class='del-mark' src='./img/icon/home_24.png' onclick='delGroupMember(this);' />" +
						"<img id="+ username +" onclick='showMemberInfo(this);' class='group-member-avator img-circle' src='"+ avatar+"'/>" +
						"<p class='profileName'>"+ username +"</p></li>";
				} else {
					ele = "<li id="+ username + " onmouseover='showDelMemMark(this);' onmouseout='hideDelMemMark(this);' >" +
						"<img id="+ username +" />" +
						"<img id="+ username +" onclick='showMemberInfo(this);' class='group-member-avator img-circle' src='"+ avatar+"'/>" +
						"<p class='profileName'>"+ username +"</p></li>";
				}
				 $('#addNewMember').before(ele);
				 $('#groupMemberInfoListUL li#'+curUser+' img.del-mark').remove();
				 var avatar = getContactAvatar100(username);
			}
	  	},
	 	fail: function(code, message){
	 		showErrorInfo(code);
	 		if(debug)
		 		console.error('getGroupInfo fail, code: '+code+', message:'+message);
	  	}
	});
};

var showMemberInfo = function(dom){
	var chatUserId = dom.id;
	$('#cName').text(chatUserId);
	var path = getContactAvatar100(chatUserId);
	var nickname = IM.contacts[chatUserId].nickname;
	var region = IM.contacts[chatUserId].region;
	var signature = IM.contacts[chatUserId].signature;
	$('#contractorInfoModal p.avator').css({"background-image": "url('"+path+"')"});
	if(nickname==''||nickname==undefined){
		$('#contractorInfoModal #cNickName').text('无');
	} else {
		$('#contractorInfoModal #cNickName').text(nickname);
	}
	if(region==''||region==undefined){
		$('#contractorInfoModal #cRegin').text('无');
	} else {
		$('#contractorInfoModal #cRegin').text(region);
	}
	if(signature==''||signature==undefined){
		$('#contractorInfoModal #cSignature').text('无');
	} else {
		$('#contractorInfoModal #cSignature').text(signature);
	}
	$('#contractorInfoModal').css({"display":"block"});
};

var addNewMember = function(){
	$('#addNewGroupMemberModal').css({"display": "block"});
	$('#a_username').val('').focus();
	var ul = $(".add-new-group-member-list-div");
     var lis = ul.children();
     var length = lis.length;
     for(var i=0; i<length; i++){
     		$(lis[i]).remove();
     }
};

//  删除群成员时 UI 标记
var showDelMemMark = function(dom){
	var id = $(dom).attr('id');
	$('img[class="del-mark"][id='+id+']').css({"display":"block"});
	$('#groupMemberInfoListUL li#'+id+' img.group-member-avator').css({
		"border": "2px solid rgb(72, 136, 224)"
	});
	$('#groupMemberInfoListUL li#'+id+' p.profileName').css({
		"color": "#528ce0"
	});
};

var hideDelMemMark = function(dom){
	var id = $(dom).attr('id');
	$('img[class="del-mark"][id='+id+']').css({'display':'none'});
	$('#groupMemberInfoListUL li#'+id+' img.group-member-avator').css({
		"border": "none"
	});
	$('#groupMemberInfoListUL li#'+id+' p.profileName').css({
		"color": "#4f4f51"
	});
};

var showDelChatMemMark = function(dom){
	var id = $(dom).attr('id');
	$('img[class="del-chat-member-list-mark"][id='+id+']').css({"display":"block"}); 
	$('.start-new-chat-list-div div#'+id).css({"border-left": "6px solid #4081df"});
	$('.add-new-group-member-list-div div#'+id).css({"border-left": "6px solid #4081df"});
};

var hideDelChatMemMark = function(dom){
	var id = $(dom).attr('id');
	$('img[class="del-chat-member-list-mark"][id='+id+']').css({'display':'none'});
	$('.start-new-chat-list-div div#'+id).css({"border-left": "6px solid #c5cdd0"});
	$('.add-new-group-member-list-div div#'+id).css({"border-left": "6px solid #c5cdd0"});
};

var backToChat = function(){
	isNeedUpdateGroupName = false;
	if (isSingleOrGroup=='group') {
		var newGroupName = $.trim($('#group_info_groupname').val());
		if(tmpGroupName!==newGroupName&&newGroupName!=''){
			curChatGroupId = Number(curChatGroupId);
			JMessage.updateGroupInfo({
				groupId: curChatGroupId,
				groupName: newGroupName.toString(),
				groupDescription: '',
				success: function(response) {
					if(debug)
					console.info('updateGroupInfo success: '+response);
					var respData = JSON.parse(response);
					var gid = respData.gid;
					var groupName = respData.groupName;
					$('.'+talkToDiv).html(groupName);
					$('#conversion-'+gid).attr("displayname", groupName);
					$('#conversion-'+gid).attr("username", groupName);
					$('#conversion-'+gid+' span.contractor-display-style').text(groupName);
					$('li#'+gid).attr("displayname", groupName);
					$('li#'+gid+' span.contractor-display-style').text(groupName);
				},
				fail: function(code, message){
					showErrorInfo(code);
					if(debug)
						console.error('updateGroupInfo fail, code: '+code+' ,message: '+message);
				}
			});
		}
	}
	var memberList = $('ul#groupMemberInfoListUL li');
	for(var i=0; i<memberList.length-1; i++){
		$(memberList[i]).remove();
	}
	$('#groupInfo').fadeOut(100);
	$('#chat01').delay(100).fadeIn();
	$('.chat02').delay(100).fadeIn();
};

//  选择联系人的处理
var getContactLi = function(chatUserId) {
	return document.getElementById(chatUserId);
};

var addMemberToChat = function(){
	$('#startNewChatModal').css({"display": "block"});
	$('#s_username').focus();
	var ul = $(".start-new-chat-list-div");
     var lis = ul.children();
     var length = lis.length;
     for(var i=0; i<length; i++){
     		$(lis[i]).remove();
     }
};

//  显示未读消息标记
var showUnreadMsgMark = function(id){
	$('#conversionlist'+' li#conversion-'+id+' span.badge').css("visibility","visible");
	var count = +$('#conversionlist'+' li#conversion-'+id).attr('unreadcount');
	$('#conversionlist'+' li#conversion-'+id).attr('unreadcount', ++count);
	$('#badge-'+id).html(count);
}

//	取消未读消息标记
var hideUnreadMsgMark = function(id){
	$('#conversionlist'+' li#conversion-'+id+' span.badge').css("visibility","hidden");
	var count = +$('#conversionlist'+' li#conversion-'+id).attr('unreadcount');
	$('#conversionlist'+' li#conversion-'+id).attr('unreadcount', 0);
}

var addToIMContacts = function(data){
	var username = data.username;
	IM.contacts[username] = data;
	if(debug)
		console.info('add contact: '+username+' to contacts');
}

var addUserToChatList = function(){
	var username = $('#s_username').val();
	var selfName = $('.login-user').text();
	if(selfName==username){
		alert('您无需添加自己');
		return;
	}
	$('#s_username').focus();
	JMessage.getUserInfo({
	   	username: username,
		success: function(response) {
			if(debug)
				console.info('userinfo: '+response);
			if($('.start-new-chat-decoration').css('display')=='none'){
				$('.start-new-chat-decoration').css({"display":"block"});
			}
			$('#s_username').val('');
			var respData = JSON.parse(response);
			addToIMContacts(respData);
			updateUsernameToNickname(respData.username, respData.nickname);
			var avatarPath = getContactAvatar38(username);
			var ele = "<div class='row member-div' id="+username+" onmouseover='showDelChatMemMark(this);'"+ 
						"onmouseout='hideDelChatMemMark(this);'><div class='col-md-3'>"+
						"<img onclick='showMemberInfo(this);' class='start-chat-member-avator img-circle'"+
						" src='"+avatarPath+"'/></div><div class='col-md-4'>"+
						"<p class='profileName'>"+username+"</p></div><div class='col-md-3'>"+
						"<img class='del-chat-member-list-mark' id="+username+" src='./img/icon/home_24.png'"+
						" onclick='delChatMember(this);' /></div></div>";

			var childDivList = $('.start-new-chat-list-div div');
			for(var i=0; i<childDivList.length; i++){
				var id = $(childDivList[i]).attr('id');
				if(id==username){
					console.info(username+' has been added');
					return;
				}
			}
			$('.start-new-chat-list-div').append(ele);
		},
		fail: function(code, message){
			showErrorInfo(code);
			if(debug)
				console.error('getUserInfo fail, code: '+code+', message: '+message);
		}
	});
};

var addUserToGroupMemberList = function(){
	var username = $('#a_username').val();
	$('#a_username').focus();
	var childDivList = $('.add-new-group-member-list-div div');
	for(var i=0; i<childDivList.length; i++){
		var id = $(childDivList[i]).attr('id');
		if(id==username){
			alert(username+' 已经被添加');
			return;
		}
	}
	if(isSingleOrGroup=='group'){
		var nameArray = IM.groups[curChatGroupId].membersUsername;
		for(var i=0; i<nameArray.length; i++){
			if(username==nameArray[i]){
				alert(username+' 已经在群组中');
					return;
			}
		}
	} else {
		var selfName = $('.login-user').text();
		if(selfName==username){
			alert('您无需添加自己');
				return;
		}
		if(curChatUserId==username){
			alert('您无需添加 '+username);
				return;
		}
	}
	JMessage.getUserInfo({
	   	username: username,
		success: function(response) {
			if(debug)
				console.info('userinfo: '+response);
			if($('.add-new-groupmember-decoration').css('display')=='none'){
				$('.add-new-groupmember-decoration').css({"display":"block"});
			}
			$('#a_username').val('');
			var respData = JSON.parse(response);
			addToIMContacts(respData);
			updateUsernameToNickname(respData.username, respData.nickname);
			var avatarPath = getContactAvatar38(username);
			var ele = "<div class='row member-div' id="+username+" onmouseover='showDelChatMemMark(this);'"+ 
						"onmouseout='hideDelChatMemMark(this);'><div class='col-md-3'>"+
						"<img onclick='showMemberInfo(this);' class='start-chat-member-avator img-circle'"+
						" src='"+avatarPath+"'/></div><div class='col-md-4'>"+
						"<p class='profileName'>"+username+"</p></div><div class='col-md-3'>"+
						"<img class='del-chat-member-list-mark' id="+username+" src='./img/icon/home_24.png'"+
						" onclick='delChatMember(this);' /></div></div>";
			$('.add-new-group-member-list-div').append(ele);
		},
		fail: function(code, message){
			showErrorInfo(code);
			if(debug)	
				console.error('getUserInfo fail, code: '+code+', message: '+message);
		}
	});
};

var startNewChatConversion = function(){
	$('#talkInputId').focus();
	var ul = $(".start-new-chat-list-div");
     var lis = ul.children();
     var length = lis.length;
     var membersUsernameArray = new Array();
     var usernameArray = new Array();
     var ownerUsername = $('.login-user').text();
	membersUsernameArray.push(ownerUsername);
     for(var i=0; i<length; i++){
     		var username = $(lis[i]).attr('id');
     		usernameArray.push(username);
     		membersUsernameArray.push(username);
     }
     if(length==0){
     		alert('请先添加一个用户');
     		return;
     } else if(length==1){
     		var chatUserId = usernameArray.pop();
     		addContractToConversionList(chatUserId, chatUserId);
     		changeLeftBordeActiveColor("li#conversion-"+chatUserId);
		if ((chatUserId != curChatUserId)) {
			if (curChatUserId == null) {
				createContactChatDiv(chatUserId);
				showContactChatDiv(chatUserId);
			} else {
				showContactChatDiv(chatUserId);
				hiddenContactChatDiv(curChatUserId);
			}
		} else {
			showContactChatDiv(chatUserId);
		}
		$('#null-page').css({"display" : "none"});
		if(curChatGroupId != null){
			hiddenGroupChatDiv(curChatGroupId);
		}
		curChatUserId = chatUserId;
		isSingleOrGroup = "single";
		showConversionTab();
		$('.'+talkToDiv).html(chatUserId);
		$('#startNewChatModal').css({"display": "none"});
		if($('.start-new-chat-decoration').css('display')=='block'){
			$('.start-new-chat-decoration').css({"display":"none"});
		}
     } else if(length>1){
		var _groupName = membersUsernameArray.slice(0,2).join(',');
     		JMessage.createGroup({
		  	groupName: '未命名',
		  	groupDescription: '测试建群',
		  	success: function(response) {
		  		if(debug)
		  	 		console.info('createGroup success: '+response);
		  	 	var respData = JSON.parse(response);
		  	 	var gid = respData.gid;
		  	 	var name = respData.groupName;
			  	var groupObject = {
			  		'gid': gid,
			  		'ownerUsername': ownerUsername,
			  		'groupName': name,
			  		'groupDesc': '',
			  		'membersUsername': membersUsernameArray
			  	};
			  	IM.groups[gid] = groupObject;
			  	if('未命名'==name){
			  		addGroupToList(gid, _groupName);
			  	} else {
			  		addGroupToList(gid, name);
			  	}
		  	 	JMessage.addGroupMembers({
					groupId: gid,          
					memberUsernames: usernameArray,
					success: function() {
						if(debug)	
							console.info('addGroupMember success');
						if($('.start-new-chat-decoration').css('display')=='block'){
							$('.start-new-chat-decoration').css({"display":"none"});
						}
						addGroupToConversionList(gid, name);
						$('li#conversion-'+gid).css({"border-left": "6px solid #4081df"});
						showConversionTab();
						chatGroupId = gid;
						if ((chatGroupId != curChatGroupId)) {
							if (curChatGroupId == null) {
								createGroupChatDiv(chatGroupId);
								showGroupChatDiv(chatGroupId);
							} else {
								showGroupChatDiv(chatGroupId);
								hiddenGroupChatDiv(curChatGroupId);
							}
						} else {
							showGroupChatDiv(chatGroupId);
						}
						$('#null-page').css({"display" : "none"});
						if(curChatUserId != null){
							hiddenContactChatDiv(curChatUserId);
						}
						curChatGroupId = chatGroupId;
						isSingleOrGroup = "group";
						$('.'+talkToDiv).html(_groupName);
						$('#startNewChatModal').css({
							"display": "none"
						});
					},
					fail: function(code, message){
						showErrorInfo(code);
						if(debug)
							console.error('addGroupMember fail, code: '+code);
					}
				});
		  	},
		  	fail: function(code, message){
		  		showErrorInfo(code);
				if(debug)
					console.error('createGroup fail, code: '+code);
		  	}
		});
     }

     // clean data
     $('#s_username').val('');
     var memberList = $('#startNewChatMemberList div');
	for(var i=0; i<memberList.length; i++){
		$(memberList[i]).remove();
	}
};

var addNewGroupMembers = function(){
	var ul = $(".add-new-group-member-list-div");
     var lis = ul.children();
     var length = lis.length;
     var membersUsernameArray = new Array();
     var usernameArray = new Array();
     var ownerUsername = $('.login-user').text();
	membersUsernameArray.push(ownerUsername);
     for(var i=0; i<length; i++){
     		var username = $(lis[i]).attr('id');
     		usernameArray.push(username);
     		membersUsernameArray.push(username);
     }
     if(length==0){
     		alert('请先添加一个用户');
     		return;
     } else if(length>0){
     		if (isSingleOrGroup=='group') {
     			curChatGroupId = Number(curChatGroupId);
	     		JMessage.addGroupMembers({
				groupId: curChatGroupId,
				memberUsernames: usernameArray,
				success: function() {
					if(debug)
						console.info('addGroupMember success');
					length = usernameArray.length;
					for(var i=0; i<length; i++){
				     		IM.groups[curChatGroupId].membersUsername.push(usernameArray.pop());
				     }
				     if(debug)
				     		console.info('group members: '+IM.groups[curChatGroupId].membersUsername.join(','));
					getAndRenderGroupMemberList(curChatGroupId);
					$('#addNewGroupMemberModal').css({"display": "none"});
					if($('.add-new-groupmember-decoration').css('display')=='block'){
						$('.add-new-groupmember-decoration').css({"display":"none"});
					}
				},
				fail: function(code, message){
					showErrorInfo(code);
					if(debug)	
						console.error('addGroupMember fail, code: '+code);
				}
			});
     		} else {
     			usernameArray.push(curChatUserId);
     			membersUsernameArray.push(curChatUserId);
     			var _groupName = membersUsernameArray.slice(0,2).join(',');
     			JMessage.createGroup({
			  	groupName: '未命名',
			  	groupDescription: '测试建群',
			  	success: function(response) {
			  		if(debug)
			  	 		console.info('createGroup success: '+response);
			  	 	var respData = JSON.parse(response);
			  	 	var gid = respData.gid;
			  	 	var name = respData.groupName;
				  	var groupObject = {
				  		'gid': gid,
				  		'ownerUsername': ownerUsername,
				  		'groupName': name,
				  		'groupDesc': '',
				  		'membersUsername': membersUsernameArray
				  	};
				  	IM.groups[gid] = groupObject;
				  	if('未命名'==name){
				  		addGroupToList(gid, _groupName);
				  	} else {
				  		addGroupToList(gid, name);
				  	}
			  	 	JMessage.addGroupMembers({
						groupId: gid,          
						memberUsernames: usernameArray,
						success: function() {
							if(debug)	
								console.info('addGroupMember success');
							addGroupToConversionList(gid, name);
							$('li#conversion-'+gid).css({"border-left": "6px solid #4081df"});
							showConversionTab();
							chatGroupId = gid;
							if ((chatGroupId != curChatGroupId)) {
								if (curChatGroupId == null) {
									createGroupChatDiv(chatGroupId);
									showGroupChatDiv(chatGroupId);
								} else {
									showGroupChatDiv(chatGroupId);
									hiddenGroupChatDiv(curChatGroupId);
								}
							} else {
								showGroupChatDiv(chatGroupId);
							}
							$('#null-page').css({"display" : "none"});
							if(curChatUserId != null){
								hiddenContactChatDiv(curChatUserId);
							}
							curChatGroupId = chatGroupId;
							isSingleOrGroup = "group";
							$('.'+talkToDiv).html(_groupName);
							$('#addNewGroupMemberModal').css({
								"display": "none"
							});
							hideGroupInfoPanel();
						},
						fail: function(code, message){
							showErrorInfo(code);
							if(debug)
								console.error('addGroupMember fail, code: '+code);
						}
					});
			  	},
			  	fail: function(code, message){
			  		showErrorInfo(code);
					if(debug)	
						console.error('createGroup fail, code: '+code);
			  	}
			});
     		}
     }

     // clean data
     $('#s_username').val('');
     var memberList = $('#addNewGroupMemberList div');
	for(var i=0; i<memberList.length; i++){
		$(memberList[i]).remove();
	}
};

var delGroupMember = function(user){
	var username = user.id;
	var membersArray = new Array();
	membersArray.push(username);
	curChatGroupId = Number(curChatGroupId);
	JMessage.removeGroupMembers({
		groupId: curChatGroupId,
		memberUsernames: membersArray,
		success: function() {
			if(debug)
				console.info('removeGroupMembers success');
			$('#groupMemberInfoListUL li#'+username).remove();
			curChatGroupId = String(curChatGroupId);
			IM.groups[curChatGroupId].membersUsername.remove(username);
			if(debug)
				console.info('group members: '+IM.groups[curChatGroupId].membersUsername.join(','));
		},
		fail: function(code, message){
			showErrorInfo(code);
			if(debug)
				console.error('removeGroupMembers fail, code: '+code+' ,message: '+message);
		}
	});
};

var delChatMember = function(dom){
	var id = dom.id;
	$('.add-new-group-member-list-div div#'+id).remove();
	$('.start-new-chat-list-div div#'+id).remove();
};

var deleteAndExitGroup = function(){
	if($('#groupInfo').css('display')=='block'){
		hideGroupInfoPanel();
	}
	var username = $('.login-user').html();
	IM.beenRemovedGroups[curChatGroupId] = username;
	curChatGroupId = Number(curChatGroupId);
	JMessage.exitGroup({
		groupId: curChatGroupId,
		success: function() {
			if(debug)
				console.info('exitGroup success');
			$('#grouplistUL li#'+curChatGroupId).remove();
			if(IM.groups.hasOwnProperty(curChatGroupId)){
				IM.groups[curChatGroupId].membersUsername.remove(username);
			}
		},
		fail: function(code, message){
			showErrorInfo(code);
			if(debug)	
				console.error('exitGroup fail, code: '+code+' ,message: '+message);
		}
	});
};

var showPersonalInfo = function(){
	var username = $('.login-user').html();
	var path = getContactAvatar100(username);
	var nickname = IM.contacts[username].nickname;
	var region = IM.contacts[username].region;
	var signature = IM.contacts[username].signature;
	$('#selfInfoModal #cName').text(username);
	$('#selfInfoModal p.avator').css({"background-image": "url('"+path+"')"});
	if(nickname==''||nickname==undefined){
		$('#selfInfoModal #cNickName').text('无');
	} else {
		$('#selfInfoModal #cNickName').text(nickname);
	}
	if(region==''||region==undefined){
		$('#selfInfoModal #cRegin').text('无');
	} else {
		$('#selfInfoModal #cRegin').text(region);
	}
	if(signature==''||signature==undefined){
		$('#selfInfoModal #cSignature').text('无');
	} else {
		$('#selfInfoModal #cSignature').text(signature);
	}
	$('#selfInfoModal').css({"display":"block"});
};

var showDetailInfo = function(dom) {
	var id = $(dom).parent().attr('id');
	var username = id.split('-')[1];
	showFriendInfo(username);
};

var showFriendInfo = function(username){
	var path = getContactAvatar100(username);
	var nickname = IM.contacts[username].nickname;
	var region = IM.contacts[username].region;
	var signature = IM.contacts[username].signature;
	$('#contractorInfoModal #cName').text(username);
	$('#contractorInfoModal p.avator').css({"background-image": "url('"+path+"')"});
	if(nickname==''||nickname==undefined){
		$('#contractorInfoModal #cNickName').text('无');
	} else {
		$('#contractorInfoModal #cNickName').text(nickname);
	}
	if(region==''||region==undefined){
		$('#contractorInfoModal #cRegin').text('无');
	} else {
		$('#contractorInfoModal #cRegin').text(region);
	}
	if(signature==''||signature==undefined){
		$('#contractorInfoModal #cSignature').text('无');
	} else {
		$('#contractorInfoModal #cSignature').text(signature);
	}
	$('#contractorInfoModal').css({"display":"block"});
};

var logout = function(){
	$('#logoutConfirmModal').css({
		"display": "block"
	});
};

var confirmLogout = function(){
	JMessage.logout();
	$('#content').css({"display": "none"});
	$('#backToLogin').css({"display": "block"});
	$('#logoutConfirmModal').css({"display": "none"});
};

var backToLogin = function(){
	window.location.reload();
};

var showErrorInfo = function(code){
	switch (code) {
		case 800005:
			showMsg('当前用户未注册');
			break;
		case 800012:
			$('#multiLoginInfoPanel').css({"display": "none"});
			showMsg('当前用户已离线');
			break;
		case 803004:
			showMsg('目标群组不存在');
			break;
		case 803005:
			showMsg('您不在目标群组中');
			break;
		case 803007:
			showMsg('消息长度超过限制');
			break;
		case 808001:
			showMsg('群组名称为空');
			break;
		case 808002:
			showMsg('您没有权限创建群组');
			break;
		case 808003:
			showMsg('您创建群组数量已达上限');
			break;
		case 808004:
			showMsg('群组名称太长');
			break;
		case 809002:
			showMsg('您不在该群组中');
			break;
		case 810008:
			showMsg('该群成员数量已达上限');
			break;
		case 811003:
			showMsg('您不在该群组中');
			break;
		case 872001:
			showMsg('您还未登陆');
			break;
		case 872002:
			showMsg('请求参数异常');
			break;
		case 872004:
			showMsg('SDK config 异常');
			break;
		case 872005:
			showMsg('SDK签名异常');
			break;
		case 872007:
			$('#multiLoginInfoPanel').css({"display": "none"});
			showMsg('与服务器断开，正在重连...');
			break;
		case 872006:
			showMsg('请求超时');
			break;
		case 898002:
			showMsg('用户不存在');
			break;
		case 898006:
			showMsg('群组ID无效，可能该群已被移除');
			break;
		default:
			showMsg('服务端异常: '+code);
			break;
	}
};

var showMsg = function(msg){
	if($('#popupInfoPanel').is(':hidden')){
		$('#popupInfoPanel').html(msg).slideToggle().delay(3000).fadeOut();
	}
};
