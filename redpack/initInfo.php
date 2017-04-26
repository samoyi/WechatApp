<?php

	// 设定微信公众平台和商户平台信息
	define('APPID', ''); // 公众平台APPID
	define('APPSECRET', ''); // 公众平台APPSECRET
	define('MCH_KEY', ''); // 商户平台秘钥
	define('SEND_NAME', '红包商户'); // 商户名称
	define('MCH_ID', ); // 商户平台商户号
	define('WISHING', '红包祝福');
	define('CLIENT_IP', ''); // 业务代码所在IP
	define('ACT_NAME', '红包活动');
	define('REMARK', '红包备注');

	// 微信支付证书路径。证书应放在有访问权限控制的目录中，保证其不会被他人得到。
	define('CERT_PEM', '../PemSafeDir/cert.pem');
	define('KEY_PEM', '../PemSafeDir/key.pem');

?>