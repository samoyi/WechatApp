<meta charset="utf-8">
<?php

	// 引入配置文件
	require 'initInfo.php';


	// 获取OpenID
	require 'getOpenID.php';
	$sCode = $_GET['code'];
	$sOpenID = getOpenID($sCode);


	// 发送红包
	require 'RedPacket.class.php';
	$RedPacket = new RedPacket;


	$sum = 302; // 红包总金额。单位分。
	// 第三个参数如果不写，发送普通红包。如果写3到20之间的整数，发送裂变红包。
	$result = $RedPacket->sendRedPack($sOpenID, $sum);


	if($result === 'success'){
		echo '领取成功，请返回拆红包。';
	}
	else{
		echo $result;
	}

?>