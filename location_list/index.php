<?php
require_once "jssdk.php";
$jssdk = new JSSDK("wx94d7908c2964b01b", "333007ca6e4ee685899896acb6ed1452");
$signPackage = $jssdk->GetSignPackage();
?>
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
<title></title>
</head>
<body>
</body>
<script src="http://res.wx.qq.com/open/js/jweixin-1.0.0.js"></script>
<script charset="utf-8" src="http://map.qq.com/api/js?v=2.exp"></script> <!--腾讯地图，需要用它将坐标转换为地址文字--> 
<script src="terraformer@1.0.7.js"></script>
<script>
<?php
	require "main.js";
?>
</script>
</html>
   