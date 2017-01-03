"use strict";

/*
 * 先看微信“查询门店列表”接口和“获取地理位置接口”接口的文档
 * 由于地图坐标不够准确，所以在确定一个位置是否在多变性范围内时，处于边界附近的点可能得出与实际相反的结果
 * AJAX请求返回的xhr.responseText：“查询门店列表”接口返回值中business_list数组的json格式字符串。
 * 微信的该接口默认每次查询20个门店，如果你的门店多于20个，应确保这里请求到所有门店组成的business_list
 *
 * 范围计算时是使用平面多边形而非地球曲面，所以不适用跨度较大的面积范围
 */

 /*
  * TODO:
  * 1. 指出自己测试时的误差距离，包括联通wifi和电信4g
  */

(function ()
{

	// 设定数据 ----------------------------------------------------------------------------------------
	// AJAX请求地址
	var sBusinessListAJAXUrl = "http://funca.cn/HaoyunlaiWechat/api/api.php?store_list";
	
	// 配送范围多边形顶点坐标
	var aPolygonX = [125.986678, 125.993416, 125.968515, 125.953746, 125.945859, 125.934379, 125.920886, 125.920958, 125.931684, 125.939095],
		aPolygonY = [41.759525, 41.753383, 41.739262, 41.723704, 41.710215, 41.702494, 41.709657, 41.716173, 41.731739, 41.740957];


		
	// 微信API配置 -------------------------------------------------------------------------------------
	wx.config({
		//debug: true,
		appId: '<?php echo $signPackage["appId"];?>',
		timestamp: '<?php echo $signPackage["timestamp"];?>', // 这里原本没有引号
		nonceStr: '<?php echo $signPackage["nonceStr"];?>',
		signature: '<?php echo $signPackage["signature"];?>',
		jsApiList: [
			'getLocation', 'openLocation']
	});

	

	// 请求门店数据 -------------------------------------------------------------------------------------
	var xhr = new XMLHttpRequest();
	xhr.addEventListener('readystatechange', function ()
	{
		if (xhr.readyState == 4){
			if (xhr.status >= 200 && xhr.status < 300 || xhr.status == 304){
				AjaxSuccessCallback(xhr.responseText);
			}
			else{
				alert("请求门店信息失败。请联系公众号客服。");
				throw new Error("请求门店信息失败");
			}
		}
	}, false);
	xhr.open("get", sBusinessListAJAXUrl, true);
	xhr.send(null);
	
	
	
	// 函数定义 ----------------------------------------------------------------------------------------
	// 本应用中函数 --------------------------------------------
	// AJAX请求成功响应之后的回调
	/*
	 * 参数是响应成功后的responseText
	 */
	function AjaxSuccessCallback(sResponseText)
	{
		var sStoreInfo = sResponseText;

		// 门店信息常量
		var aStoreBaseInfo = getAllStoreBaseInfo(sStoreInfo, ["base_info"]),
			aCity = getAllCitise(sStoreInfo, ["base_info", "city"]);

		wx.ready(function ()
		{
			wx.getLocation({
				success: function (res){ // 提供坐标则所有门店根据距离排序
					getLocationSuccessCallback(res, aStoreBaseInfo);
				},
				cancel: function (){ // 不提供坐标则所有门店根据城市
					getLocationFailCallback(aStoreBaseInfo, aCity);
				}
			});
		});
	};

	// 用户同意授权地理位置后执行的函数
	/*
	 * 参数为微信getLocation接口获取授权成功时的回调函数的参数
	 */
	function getLocationSuccessCallback(res, aStoreBaseInfo)
	{
		var longitude = res.longitude,
			latitude = res.latitude; 

		// 根据门店距离用户位置来重排序门店数组
		aStoreBaseInfo.sort(function (a, b){
			return getDistanceByCoordinates(longitude, latitude, a.longitude, a.latitude) - getDistanceByCoordinates(longitude, latitude, b.longitude, b.latitude);
		});
	}
	
	// 用户不同意授权地理位置时执行的函数
	function getLocationFailCallback(aStoreBaseInfo, aCity)
	{
		
	}

	
	// 腾讯接口相关函数 ----------------------------------------
	// 取得所有门店的城市名组成给数组
	/*
	 * 不重复记录城市
	 * 第一个参数是xhr.responseText
	 * 第二个参数是第一个参数转为对象后，为了找到某个属性而查询的所有属性名组成的数组
	 * 例如第一个参数转化为对象后为 oStoreInfo，为了找到城市名，需要 oStoreInfo.base_info.city，因此第二个参数要传入 ["base_info", "city"]
	 * 正常情况下第二个参数是固定的，并不需要写成参数。但为了不依赖微信“查询门店列表”接口返回值的结构，还是将其参数化
	 */
	function getAllCitise(sStoreInfo, aPropPath)
	{
		var aCity = [],
			aStoreInfo = JSON.parse(sStoreInfo);
		
		aStoreInfo.forEach(function (value, index, array){
			var sCity = "";
			aPropPath.forEach(function (item){
				value = sCity = value[item];
			});
			if (aCity.indexOf(sCity) === -1){ // 取得所有城市
				aCity.push(sCity);
			}
		});
		return aCity;
	};

	// 取得所有门店信息的base_info对象组成的数组
	/*
	 * 第一个参数是xhr.responseText
	 * 第二个参数同getAllCitise函数的第二个参数
	 */
	 function getAllStoreBaseInfo(sStoreInfo, aPropPath)
	{
		var aStoreBaseInfo = [],
			aStoreInfo = JSON.parse(sStoreInfo);

		aStoreInfo.forEach(function (value, index, array){
			var oStoreBaseInfo = "";
			aPropPath.forEach(function (item){
				value = oStoreBaseInfo = value[item];
			});
			aStoreBaseInfo.push(oStoreBaseInfo);
		});
		return aStoreBaseInfo;
	};

	// 根据位置坐标调用微信接口显示地图
	/*
	 * 前两个参数是经度和纬度。也可以输入字符类型，会被转换为数值类型。
	 * 第三、第四参数设置位置名称和位置地址
	 * 第五参数设置地图缩放级别范围从1~28。默认为最大
	 * 第六个参数设置在查看位置界面底部显示的超链接,可点击跳转
	 */
	function openMap(nLongitude, nLatitude, sName, sAddress, nScale, sLink)
	{
		wx.openLocation({
			longitude: parseFloat(nLongitude), 
			latitude: parseFloat(nLatitude),
			name: sName, 
			address: sAddress, 
			scale: nScale, 
			infoUrl: sLink 
		});
	};
	
	// 腾讯地图接口将坐标转换成地址字符串
	/*
	 * 第三个参数是转换成功后的回调函数，接受一个参数，表示转换后的地址字符串
	 */
	function getAddressFromCoordinate(nLatitude, nLongitude, fnCallback)
	{
		var geocoder = new qq.maps.Geocoder({
			complete: function (result)
			{
				fnCallback(result.detail.address);
			}
		});
		var latLng = new qq.maps.LatLng(nLatitude, nLongitude);
		geocoder.getAddress(latLng);
	}

	
	// 地理相关函数 --------------------------------------------
	// 根据两点坐标计算距离。返回值单位是km
	/*
	 * 第五个参数设置地球半径的公里数，默认6371
	 */
	function getDistanceByCoordinates(nLongitude1, nLatitude1, nLongitude2, nLatitude2, nEarthRadius)
	{
		function degreeToRadian(nDegree){
			return nDegree * Math.PI / 180;
		}

		function calcCrow(nLongitude1, nLatitude1, nLongitude2, nLatitude2)
		{
			var EARTH_RADIUS = nEarthRadius ? nEarthRadius : 6371;
			var dLat = degreeToRadian(nLatitude2 - nLatitude1);
			var dLon = degreeToRadian(nLongitude2 - nLongitude1);
			nLatitude1 = degreeToRadian(nLatitude1);
			nLatitude2 = degreeToRadian(nLatitude2);

			var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(nLatitude1) * Math.cos(nLatitude2);
			var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
			var d = EARTH_RADIUS * c;
			return d;
		}
		return calcCrow(nLatitude1, nLongitude1, nLatitude2, nLongitude2);
	};
	
	// 计算一个坐标点是否在一个多边形中
	/*
	 * 使用了 Terraformer （http://terraformer.io/）
	 * 第一个参数是多边形每个点的横坐标组成的数组 
	 * 第二个参数是多边形每个点的纵坐标组成的数组。顺序对应第一个参数。
	 * 第三个参数是检测点的横坐标和纵坐标组成的两项数组
	 * 坐标点位于多边形的边上也不算在多边形中
	 */
	function isPointInPolygon(aLongitude, aLatitude, aCheckedPoint)
	{
		var aCoordinates = [];
		aLongitude.forEach(function(item, index){
			aCoordinates.push( [item, aLatitude[index]] );
		});
		console.log(aCoordinates);
		console.log(aCheckedPoint);
		var polygon = new Terraformer.Primitive({
			"type": "Polygon",
			"coordinates": [aCoordinates]
		});
		var point = new Terraformer.Primitive({
			"type": "Point",
			"coordinates": [aCheckedPoint[0], aCheckedPoint[1]]
		});
		return point.within(polygon);
	}

})();
