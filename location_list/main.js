"use strict";

/*
 * “查询门店列表”接口返回值中business_list数组的json格式字符串
 * 微信的该接口默认每次查询20个门店，如果你的门店多余20个，应确保这里请求到所有门店组成的business_list
 */

{
	(function ()
	{

		// 公共函数 ----------------------------------------------------------------------------------------
		// 取得所有城市名组成给数组
		/*
		 * 第一个参数是微信 Store.class.php 中 queryStoreList方法的字符串返回值
		 * 第二个参数是第一个参数转为对象后，为了找到某个属性而查询的所有属性名组成的数组
		 * 例如第一个参数转化为对象后为 oStoreInfo，为了找到城市名，需要 oStoreInfo.base_info.city，因此第二个参数要传入 ["base_info", "city"]
		 */
		function getAllCitise(sStoreInfo, aPropPath)
		{
			var aCity = [],
				aStoreInfo = JSON.parse(sStoreInfo);
			aStoreInfo.forEach(function (value, index, array)
			{
				var sCity = "";
				aPropPath.forEach(function (item)
				{
					value = sCity = value[item];
				});
				if (aCity.indexOf(sCity) === -1) // 取得所有城市
				{
					aCity.push(sCity);
				}
			});
			return aCity;
		};

		// 取得所有门店信息的base_info对象组成的数组
		/*
		 * 参考微信“查询门店列表”接口
		 * 第一个参数是business_list数组的json格式字符串，即这里Ajax请求的返回值
		 * 第二个参数同getAllCitise函数的第二个参数
		 */
		 function getAllStoreBaseInfo(sStoreInfo, aPropPath)
		{
			var aStoreBaseInfo = [],
				aStoreInfo = JSON.parse(sStoreInfo);

			aStoreInfo.forEach(function (value, index, array)
			{
				var oStoreBaseInfo = "";
				aPropPath.forEach(function (item)
				{
					value = oStoreBaseInfo = value[item];
				});
				aStoreBaseInfo.push(oStoreBaseInfo);
			});
			return aStoreBaseInfo;
		};


		// 根据坐标显示地图
		/*
		 * 后两个参数是位置名称和位置地址
		 */
		function openMap(latitude, longitude, name, address)
		{
			wx.openLocation({
				latitude: parseFloat(latitude), // 纬度，浮点数，范围为90 ~ -90
				longitude: parseFloat(longitude), // 经度，浮点数，范围为180 ~ -180。
				name: name, // 位置名
				address: address, // 地址详情说明
				scale: 14, // 地图缩放级别,整形值,范围从1~28。默认为最大
				infoUrl: '' // 在查看位置界面底部显示的超链接,可点击跳转
			});
		};

		// 根据两点坐标计算距离。返回值单位是km
		function getDistanceByCoordinates(nLatitude1, nLongitude1, nLatitude2, nLongitude2)
		{
			function degreeToRadian(nDegree)
			{
				return nDegree * Math.PI / 180;
			}

			function calcCrow(nLatitude1, nLongitude1, nLatitude2, nLongitude2)
			{
				var EARTH_RADIUS = 6371;
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

		// 微信API配置 -------------------------------------------------------------------------------------


		// AJAX回调 -----------------------------------------------------------------------------------------
		function AjaxSuccessCallback(sResponseText)
		{
			var sStoreInfo = sResponseText;

			// 门店信息常量
			var aStoreBaseInfo = getAllStoreBaseInfo(sStoreInfo, ["base_info"]),
				aCity = getAllCitise(sStoreInfo, ["base_info", "city"]);

			var latitude = 0; // 纬度，浮点数，范围为90 ~ -90
			var longitude = 0; // 经度，浮点数，范围为180 ~ -180。
			var accuracy = 0; // 位置精度

			function getLocationSuccessCallback(res)
			{
				latitude = res.latitude; // 纬度，浮点数，范围为90 ~ -90
				longitude = res.longitude; // 经度，浮点数，范围为180 ~ -180。
				accuracy = res.accuracy; // 位置精度


				// 根据门店距离用户位置来重排序门店数组
				aStoreBaseInfo.sort(function (a, b)
				{
					return getDistanceByCoordinates(latitude, longitude, a.latitude, a.longitude) - getDistanceByCoordinates(latitude, longitude, b.latitude, b.longitude);
				});

				// 计算距离比较耗时，计算完再向用户显示定位信息
				function getAddressFromCoordinate(nLatitude, nLongitude)
				{
					var geocoder = new qq.maps.Geocoder({
						complete: function complete(result)
						{
							function isPointInPolygon(aLongitude, aLatitude, aTestPoint)
							{
								var polygon = new Terraformer.Primitive({
									"type": "Polygon",
									"coordinates": [[[aLongitude[0], aLatitude[0]], [aLongitude[1], aLatitude[1]], [aLongitude[2], aLatitude[2]], [aLongitude[3], aLatitude[3]], [aLongitude[4], aLatitude[4]], [aLongitude[5], aLatitude[5]], [aLongitude[6], aLatitude[6]]]]
								});

								var point = new Terraformer.Primitive({
									"type": "Point",
									"coordinates": [aTestPoint[0], aTestPoint[1]]
								});

								return point.within(polygon);
							}
						}
					});
					var latLng = new qq.maps.LatLng(nLatitude, nLongitude);
					geocoder.getAddress(latLng);
				}

				getAddressFromCoordinate(latitude, longitude);
			}


			wx.ready(function ()
			{
				wx.getLocation({
					success: function success(res) // 提供坐标则所有门店根据坐标排序
					{
						getLocationSuccessCallback(res);
					},
					cancel: function cancel(res) // 不提供坐标则用户选择城市列表
					{
						getLocationFailCallback();
					}
				});
			});
		};

		// 请求门店数据 -------------------------------------------------------------------------------------


		// 设定数据 ----------------------------------------------------------------------------------------
		// 配送范围多边形顶点坐标
		var aPolygonX = [125.986678, 125.993416, 125.968515, 125.953746, 125.945859, 125.934379, 125.920886, 125.920958, 125.931684, 125.939095],
			aPolygonY = [41.759525, 41.753383, 41.739262, 41.723704, 41.710215, 41.702494, 41.709657, 41.716173, 41.731739, 41.740957];
		// 分享信息	
		wx.config({
			//debug: true,
			appId: '<?php echo $signPackage["appId"];?>',
			timestamp: '<?php echo $signPackage["timestamp"];?>', // 这里原本没有引号
			nonceStr: '<?php echo $signPackage["nonceStr"];?>',
			signature: '<?php echo $signPackage["signature"];?>',
			jsApiList: [
				// 所有要调用的 API 都要加到这个列表中
				'getLocation', 'openLocation']
		});


		var xhr = new XMLHttpRequest();
		xhr.addEventListener('readystatechange', function ()
		{
			if (xhr.readyState == 4)
			{
				if (xhr.status >= 200 && xhr.status < 300 || xhr.status == 304)
				{
					//console.log(xhr.responseText);
					AjaxSuccessCallback(xhr.responseText);
				}
				else
				{
					throw new Error("请求门店信息失败");
				}
			}
		}, false);
		xhr.open("get", "http://funca.cn/HaoyunlaiWechat/api/api.php?store_list", true);
		xhr.send(null);
	})();
}