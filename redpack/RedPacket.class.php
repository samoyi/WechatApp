<?php	
 
	class RedPacket
	{
        private $curl_post_ssl_err = '';
		
		private function curl_post_ssl($url, $data, $second=30,$aHeader=array())
		{
			$ch = curl_init();
			//超时时间
			curl_setopt($ch,CURLOPT_TIMEOUT,$second);
			curl_setopt($ch,CURLOPT_RETURNTRANSFER, 1);
			//这里设置代理，如果有的话
			//curl_setopt($ch,CURLOPT_PROXY, '10.206.30.98');
			//curl_setopt($ch,CURLOPT_PROXYPORT, 8080);
			curl_setopt($ch,CURLOPT_URL,$url);
			curl_setopt($ch,CURLOPT_SSL_VERIFYPEER,false);
			curl_setopt($ch,CURLOPT_SSL_VERIFYHOST,false);
			
			curl_setopt($ch,CURLOPT_SSLCERT, CERT_PEM);
			curl_setopt($ch, CURLOPT_SSLKEY, KEY_PEM);

			if( count($aHeader) >= 1 ){
				curl_setopt($ch, CURLOPT_HTTPHEADER, $aHeader);
			}
		 
			curl_setopt($ch, CURLOPT_POST, 1);
			curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
			$result = curl_exec($ch);

			// 以下判断通信是否成功。领取规则设定不对导致的失败不在这里体现
			if($result){
				curl_close($ch);
				return $result;
			}
			else { 
				$error = curl_errno($ch);
				$this->curl_post_ssl_err = $error;
				curl_close($ch);
				return false;
			}
		}
		
		
		// 不精确的生成一天之内不重复的十位数字字符串
		/*
		 *	所谓不精确：返回的是当前秒数精确到后四位的浮点数。即如果在万分之一秒内两次执行，则返回重复的值
		 */
		private function generateNonredundantNumberOndDay_i()
		{
			$hour = date("H");
			$minute = date("i");
			$second = date("s");
			return $hour . $minute . $second . substr(microtime(), 2, 4);
		}
	
		// 生成随机字符串
		private function generateRandomString($length) 
		{
			$characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
			$charactersLength = strlen($characters);
			$nRrandMax = $charactersLength-1;
			$randomString = '';
			for ($i = 0; $i < $length; $i++) {
				$randomString .= $characters[rand(0, $nRrandMax)];
			}
			return $randomString;
		}
		
		// 生成mch_billno
		private function generateMchBillno()
		{
			return MCH_ID . date('Ymd') . $this->generateNonredundantNumberOndDay_i();
		}
		
		// 数组转换成XML字符串
		private function arrayToDataXMLString($array)
		{
			function makeXMLNodeStr($key, $value)
			{
				return "<$key><![CDATA[$value]]></$key>";
			}
			
			function __forEach($array)
			{	
				$data = "";
				foreach($array as $key=>$value)
				{
					if( is_array($value) )
					{	
						__forEach($value);
					}
					else
					{	
						$data .= makeXMLNodeStr($key, $value);
					}
				}
				return $data;
			}
			return "<xml>" . __forEach($array) . "</xml>";
		}
		
		// 生成签名
		private function getSign($aArgument, $sMerchantKey)
		{
			$stringA = "";
			ksort($aArgument);
			foreach($aArgument as $key=>$value)
			{
				$stringA .= $key . '=' . $value . '&';
			}
			$stringA = substr($stringA, 0, -1);
			
			$stringSignTemp = $stringA . '&key=' . $sMerchantKey;
			return $sign = strtoupper( MD5($stringSignTemp) );
		}
		
		// 发送红包
		/*
		 *  兼容普通红包和裂变红包
		 *  第一个参数是接受者的OpenID（裂变红包的情况下，为第一个人的OpenID）
		 *  第二个参数是总金额
		 *  第三个参数如果填3到20之间的整数，则发送裂变该整数份的裂变红包。否则默认为1，发送普通红包
		 */
		public function sendRedPack($re_openid, $nCent, $num=1 )
		{	
			$nonce_str = $this->generateRandomString(32);
			$mch_billno = $this->generateMchBillno();
			$total_amount = $nCent; // 红包额度。单位分。

			$aArgumentsWithoutSign = array(
				"nonce_str"=> $nonce_str,
				"mch_billno"=> $mch_billno,
				"mch_id"=> MCH_ID,
				"wxappid"=> APPID,
				"send_name"=> SEND_NAME,
				"re_openid"=> $re_openid,
				"total_amount"=> $total_amount,
				"total_num"=> $num,
				"wishing"=> WISHING,
				"client_ip"=> CLIENT_IP,
				"act_name"=> ACT_NAME,
				"remark"=> REMARK
			);
			
			$url = 'https://api.mch.weixin.qq.com/mmpaymkttransfers/sendredpack';
			
			if( $num>2 ){ // 列表红包
				$aArgumentsWithoutSign['amt_type'] = 'ALL_RAND';
				$url = 'https://api.mch.weixin.qq.com/mmpaymkttransfers/sendgroupredpack';
			}
		
			$sign = $this->getSign($aArgumentsWithoutSign, MCH_KEY);
			$aArgumentsWithoutSign["sign"] = $sign;
			$aArgument = $aArgumentsWithoutSign;
			$data = $this->arrayToDataXMLString($aArgument);
			$result = $this->curl_post_ssl($url, $data);
			if(!$result){
			    return $this->curl_post_ssl_err;
			}

			// 判断是否有红包设置导致的出错
			$xmlobj = simplexml_load_string($result, 'SimpleXMLElement', LIBXML_NOCDATA);
			function xml2array ( $xmlObject, $out = array () )
			{
				foreach ( (array) $xmlObject as $index => $node )
					$out[$index] = ( is_object ( $node ) ) ? xml2array ( $node ) : $node;

				return $out;
			}
			$xmlArr = xml2array ( $xmlobj );

			if( $xmlArr["result_code"] === "FAIL" )
			{
				return $xmlArr["err_code_des"];
			}
			return 'success';
		}
	}
?>