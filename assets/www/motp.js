var pin, profile;

function isEmpty(val){
	if(!val || val.length == 0)return true;
	return false;
}

$('#pinPage').live('pageinit',function(event){
	//no profile configured
	if(!localStorage.getItem('sNames')){
		$.mobile.changePage($("#configPage"));
	}
	
	//add new profile
	$( "#profile" ).change(function(){
		var val = $("#profile").val();
		if(val == '__new__'){
			pin = '';
			profile = '';
			$.mobile.changePage($("#configPage"));
		}
	});
	
	$( "#config" ).click(function(){
		pin = $("#pin").val();
		profile = $("#profile").val();			

		if(isEmpty(pin)){
			alert("Enter pin!");
			return false;
		}
		
		if(hex_md5(pin) != localStorage.getItem(profile + '.sPin')){
			alert("Wrong pin!");
			return false;
		}
		
		$("#pin").val('');
		localStorage.setItem("sLastProfile", profile);
	});
	
	//submit
	$( "#aPinForm" ).submit(function(event){
		event.preventDefault();
		profile = $("#profile").val();
		pin = $("#pin").val();
		
		if(isEmpty(pin)){
			alert("Enter pin!");
			return false;
		}
		
		if(hex_md5(pin) == localStorage.getItem(profile + '.sPin')){
			$("#pin").val('');
			var secret = $.rc4DecryptStr(localStorage.getItem(profile + '.sSecret'), pin);
			var offset = localStorage.getItem(profile + '.sOffset');
			localStorage.setItem("sLastProfile", profile);
			motp(pin, secret, offset);
		}else{
			alert("Wrong pin!");
		}
		return false;
	});	
});

var cMandatoryFields = ["#cName", "#cPin"];
var cFields = ["#cSecret", "#cAdvanced", "#cSeed", "#cOffset"];

function showHideAdvanced(){
	var useSeed = $('#cAdvanced').val();
	//D!alert("UseSeed:" + useSeed);
	if(useSeed == 'on'){
		$('.fAdvanced').show();
	}else{
		$('.fAdvanced').hide();
	}
}

$('#configPage').live('pageinit',function(event){
	
	$('#cAdvanced').change(showHideAdvanced);
	
	//save
	$("#aConfigForm").submit(function(event){
		event.preventDefault();
		
		//check mandatory
		for(i in cMandatoryFields){
			var cId = cMandatoryFields[i];
			var sId = cId.replace(/^#c/gi, "s");
			var cVal = $(cId).val();
			if(isEmpty(cVal)){
				alert(sId + " is mandatory!");
				return false;
			}
		}
		
		if($('#cAdvanced').val() == 'off'){
			$("#cSeed").val('');
			$("#cOffset").val('0');
		}
		
		var cSecret = $("#cSecret").val();
		var cSeed = $("#cSeed").val();
		if(isEmpty(cSecret) && isEmpty(cSeed)){
			alert("Either secret or seed is mandatory!");
			return false;
		}
		if(!isEmpty(cSecret) && cSecret.length < 16 && !'/^[0-9a-fA-F]$/'.test(cSecret)){
			alert("Secret must be 16 hex digits long!");
			return false;
		}
		if(!isEmpty(cSeed) && cSeed.length < 20){
			alert("Secret must be 20 chars long!");
			return false;
		}

		if(!isEmpty(cSeed)){
			cSecret = seed2Secret(cSeed);
			$("#cSecret").val(cSecret);
			alert("Generated secret: " + cSecret);
		}
		
		pin = $("#cPin").val();
		var cName = $.trim($("#cName").val());
		
		var cNames = localStorage.getItem("sNames");
		if(!cNames){
			localStorage.setItem("sNames", cName);
		}else{
			var aNames = cNames.split(",");
			for(var i=0; i<aNames.length; i++){
				//D!console.log("Profile: " + aNames[i]);
				if(aNames[i] == cName){
					alert("Profile " + cName + " exists already!");
					return false;
				}
			}
			aNames.push(cName);
			localStorage.setItem("sNames", aNames.join(","));
		}
		
		//save pin
		localStorage.setItem(cName + ".sPin", hex_md5(pin));
		
		for (i in cFields){
			var cId = cFields[i];
			var cVal = $(cId).val();
			var sId = cName + "." + cId.replace(/^#c/gi, "s");
			if(cId == "#cAdvanced" || cId == "#cOffset"){
				localStorage.setItem(sId, cVal);
			}else{//encrypted rest
				if(cId == "#cSecret"){
					cVal = cVal.toLowerCase();
				}
				localStorage.setItem(sId, $.rc4EncryptStr(cVal, pin));
			}
		}
		
		$.mobile.changePage($("#pinPage"));
		return false;
	});
	
	//delete
	$( "#cDelete" ).click(function(){
		if(confirm("Delete profile: " + profile)){
			var cNames = localStorage.getItem("sNames");
			if(cNames){
				var aNames = cNames.split(",");
				var nNames = [];
				for(var i=0; i<aNames.length; i++){
					//D!console.log("Profile: " + aNames[i]);
					if(aNames[i] != profile){
						nNames.push(aNames[i]);
					}
				}
				localStorage.setItem("sNames", nNames.join(","));
			}
		}else{
			return false;
		}
	}); 
});

$(document).bind("pagechange", function( event, data ){
	var pageId = data.toPage.attr('id');
	if(pageId == "configPage"){
		if(!isEmpty(pin) && !isEmpty(profile)){
			$('#cName').val(profile);
			$('#cPin').val(pin);
			for(i in cFields){
				var cId = cFields[i];
				var cVal = $(cId).val();
				var sId = profile + '.' + cId.replace(/^#c/gi, "s");
				if(cId == "#cAdvanced" || cId == "#cOffset"){
					$(cId).val(localStorage.getItem(sId));
				}else{//encrypted rest
					$(cId).val($.rc4DecryptStr(localStorage.getItem(sId), pin));
				}
			}
			$("#cDelete").show();
		}else{
			$('#cName').val(profile);
			$('#cPin').val(pin);
			$('#cSecret').val('');
			$("#cAdvanced").val('off');
			
			$("#cDelete").hide();
		}
		showHideAdvanced();
	}
	if(pageId == "pinPage"){
		$('#fTimer').hide();
		var cNames = localStorage.getItem("sNames");
		if(cNames){
			var aNames = cNames.split(",");
			var fProfile = $('#profile');
			fProfile.find('option').remove();

			for(var i=0; i<aNames.length; i++){
				console.log("Profile: " + aNames[i]);
				fProfile.append(new Option(aNames[i], aNames[i]));
				fProfile.val(aNames[i]);
			}
			fProfile.append(new Option("New profile", "__new__"));
			var lastProfile = localStorage.getItem('sLastProfile');
			if(lastProfile){
				fProfile.val(lastProfile);
			}
			fProfile.selectmenu("refresh");
		}
	}
});

function motp (pin, secret, offset) {
	var time = new Date();
	time = time.getTime() / 1000 / 10;
	time = Math.floor(time);
	time = time + offset*6;
	var otp = hex_md5( time + secret + pin );
	$("#otpResult").text(otp.substring(0,6));
	$('#fTimer').show();

	$(document).everyTime(1000, function(i) {
		  $("#timer").val(180 - i);
		  $("#timer").slider("refresh");
		  if(i == 180){
			  $("#otpResult").text('');
			  $('#fTimer').hide();
		  }
	}, 180);
}

function seed2Secret(seed) {
	return hex_md5(seed).substring(0,16);
}