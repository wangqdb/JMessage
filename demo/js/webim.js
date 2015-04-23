/* --------------   自定义全局变量  -------------------- */
var curUsername; // 当前聊天对象（人）的username
var curGid;      // 当前聊天对象（群）的gid
var preUsername;
var preGid;
var curChatType = "noChat"; // 当前聊天类型 "single" or "group"
var talkToDivId = "talkTo";
/* -------------- 自定义数据结构存储 ------------------- */
var IM = {
	contract: {
		// 存储 username -> UserModal 的数据 
	},
	group: {
		// 存储 gid -> GroupModal 的数据
	}
};

var GroupModal = {
		gid: '',
		ownerUsername: '',
		groupName: '',
		groupDesc: '',
		membersUsername: []
};
/* -----------------------------------------------------*/
JMessage.config({
	appKey: '4f7aef34fb361292c566a1cd',   
	timestamp: 'timestamp2',     
	randomStr: 'randomStr3',
	signature: 'signature4'
});

JMessage.ready(function(){
	console.log('config ready');
});

JMessage.error(function(code, message){
	console.log('config error code: '+code+', message: '+message);
});

JMessage.onConnected(function(){
	console.log('connect success');        
});

JMessage.onDisconnected(function(){
	console.log('disconnected from server');        
});

// 用户登陆
var login = function(){
	var username = $('#username').val();
	var password = $('#password').val();
	if(username==''||username==undefined||password==''||password==undefined){
		alert('请将用户名和密码输入完整');
		return;
	}
	$('#loginPanel').css({"display":"none"});
	document.body.style.backgroundImage = '';
	document.body.style.backgroundColor = '#FFFFFF';
	$('#waitLoginmodal').css({"display":"block"}); 
	JMessage.login({
		username: username,
		password: password,
		success: function(){
			loginSuccess();
		},
		fail: function(code, message){
			console.log('user login fail, code: '+code+', message: '+message);
			$('#waitLoginmodal').css({"display":"none"});
			alert('登陆失败，可能您的帐号和密码错误');
			location.reload();
		}
	});
};

// 登陆成功处理
var loginSuccess = function(){
	console.log('user login success');
	createConversionlistUL();  //  创建会话列表
	JMessage.getGroupList({    //  获取群组列表
		  success: function(response) {
			  getGroupListSuccess(response);
		  },
		  fail: function(code, message){
			  console.log('user getGroupList fail, code: '+code+', message:'+message);
		  }
	});
	$("body").eq(0).css({
		"background-image":"url('./img/bg/imbg003.png')",
		"background-attachment":"fixed",
		"background-repeat":"no-repeat",
		"background-size":"cover",
		"-moz-background-size":"cover",
		"-webkit-background-size":"cover"
	});
	$('#waitLoginmodal').css({"display":"none"});
	$('#content').css({"display":"block"});
};

// 获取群组成功处理
var getGroupListSuccess = function(response){
	console.log('user getGroupList success');
	var data = JSON.parse(response);
	var length = data.length;
	for(var i=0; i<length; i++){
		var groupObject = data[i];
		var gid = groupObject.gid;
		var groupName = groupObject.groupName;
		IM.group.gid = groupObject;
		createGrouplistUL(gid, groupName);
	}
};


/*--------------  UI 创建部分   --------------*/
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
var createGroupslistUL = function() {
	var grouplistUL = document.getElementById("grouplistUL");
	if(grouplistUL==undefined){
		var uielem = document.createElement("ul");
		$(uielem).attr({
			"id" : "grouplistUL",
			"class" : "listUL"
		});
		var contactlist = document.getElementById("grouplist");
		contactlist.appendChild(uielem);
	}
};
var createGrouplistUL = function(gid, groupName) {
	createGroupslistUL(); // 创建群组列表UI
	var uielem = document.getElementById("grouplistUL");

	var lielem = document.createElement("li");
	$(lielem).attr({
		'id' : gid,
		'chat' : 'chat',
		'onclick' : 'chooseGroupDivClick(this)',
		'displayName' : groupName,
	});

	var imgelem = document.createElement("img");
	imgelem.setAttribute("src", "./img/head/group_normal.png");
	imgelem.setAttribute("style", "border-radius: 50%;");

	var unreadelem = document.createElement("img");
	unreadelem.setAttribute("src", "./img/msg_unread.png");
	unreadelem.setAttribute("class", "unread");
	unreadelem.setAttribute("style", "visibility:hidden");
	lielem.appendChild(imgelem);
	lielem.appendChild(unreadelem);

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

// 点击选择群列表中的群后的操作
var chooseGroupDivClick = function(li) {
	curGid = li.id;
	if(curChatType=='noChat'){ 
		createGroupChatDiv(curGid);
		showGroupChatDiv(curGid);
		$('#grouplistUL li#'+curGid).css({
			"backgroundColor":"#A5AA58"
		});
		$('#null-nouser').css({
			"display" : "none"
		});
		preGid = curGid;
	} else if('group'==curChatType){
		if(preGid==curGid){
			showGroupChatDiv(curGid);
		} else {
			createGroupChatDiv(curGid);
			showGroupChatDiv(curGid);
			hiddenGroupChatDiv(preGid);
			$('#grouplistUL li#'+curGid).css({
				"backgroundColor":"#A5AA58"
			});
			$('#grouplistUL li#'+preGid).css({
				"backgroundColor":""
			});
		}
	} else if('single'==curChatType){
		createGroupChatDiv(curGid);
		showGroupChatDiv(curGid);
		hiddenContactChatDiv(curUsername);
	}
	curChatType = "group";
	$('#roomInfo').css({
		"visibility": "visible"
	});
};

// 创建一个群组聊天窗口
var createGroupChatDiv = function(chatGroupId) {
	var newContent = document.createElement("div");
	newContent.setAttribute("id", chatGroupId);
	newContent.setAttribute("class", "chat01_content");
	newContent.setAttribute("className", "chat01_content");
	newContent.setAttribute("style", "display:none");
	return newContent;
};

// 显示群组的聊天窗口
var showGroupChatDiv = function(chatGroupId) {
	var contentDiv = document.getElementById(chatGroupId);
	if (contentDiv==null||contentDiv==undefined) {
		contentDiv = createGroupChatDiv(chatGroupId);
		document.getElementById(msgCardDivId).appendChild(contentDiv);
	}
	contentDiv.style.display = "block";
	var groupName = $('li#'+chatGroupId).attr("displayName");
	var displayTitle = "正在 " + groupName + " 群里聊天中";
	document.getElementById(talkToDivId).children[0].innerHTML = displayTitle;
};

// 对上一个群组的聊天窗口做隐藏处理
var hiddenGroupChatDiv = function(chatGroupId) {
	var contactLi = document.getElementById(chatGroupId);
	if (contactLi) {
		contactLi.style.backgroundColor = "";
	}
	var contentDiv = document.getElementById(chatGroupId);
	if (contentDiv) {
		contentDiv.style.display = "none";
	}
};

// 对上一个联系人的聊天窗口做隐藏处理
var hiddenContactChatDiv = function(chatUsername) {
	var contactLi = document.getElementById(chatUsername);
	if (contactLi) {
		contactLi.style.backgroundColor = "";
	}
	var contentDiv = document.getElementById(chatUsername);
	if (contentDiv) {
		contentDiv.style.display = "none";
	}
};

// 左边栏仿tab处理
var showConversionTab = function(){
	$('#conversionlist').fadeIn('normal');
	$('#contractlist').css({
		display:"none"
	});
	$('#grouplist').css({
		display:"none"
	});
	$('#conversionTab').parent().attr('class', 'active');
	$('#friendsTab').parent().attr('class', '');
	$('#groupsTab').parent().attr('class', '');
};

var showFriendsTab = function(){
	$('#contractlist').fadeIn('normal');
	$('#conversionlist').css({
		display:"none"
	});
	$('#grouplist').css({
		display:"none"
	});
	$('#friendsTab').parent().attr('class', 'active');
	$('#conversionTab').parent().attr('class', '');
	$('#groupsTab').parent().attr('class', '');
};

var showGroupTab = function(){
	$('#grouplist').fadeIn('normal');
	$('#conversionlist').css({
		display:"none"
	});
	$("#contractlist").css({
		display:"none"
	});
	$('#groupsTab').parent().attr('class', 'active');
	$("#conversionTab").parent().attr('class', '');
	$('#friendsTab').parent().attr('class', '');
};

