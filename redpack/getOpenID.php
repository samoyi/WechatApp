<?php

	function getOpenID($sCode)
	{
		$url = 'https://api.weixin.qq.com/sns/oauth2/access_token?appid=' .APPID . '&secret=' . APPSECRET . '&code=' . $sCode . '&grant_type=authorization_code';
		$result = httpGet($url);
		$sOpenID = json_decode($result)->openid;
		return $sOpenID;
	}
	function httpGet($url)
	{
		$ch = curl_init();
		curl_setopt($ch, CURLOPT_URL, $url);
		curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, FALSE);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
		$output = curl_exec($ch);
		curl_close($ch);
		return $output;
	}	
	
?>