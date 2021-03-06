'use strict';

// save settings
const saveSettings = (msgbox = true) => {
    let settings = {};
    settings['currency'] = $('select#currency').val();
    settings['lang'] = $('select#lang').val();
    settings['conversion'] = $('textarea#conversion').val();
    settings['amount'] = $('input#amount').val();
    settings['convert_from'] = $('input#convert_from').val();
    settings['convert_to'] = $('input#convert_to').val();
    chrome.storage.sync.set({ 
        cointools: settings
    }, function() {
        if (msgbox) {
            alert(get_text('alert_save'));
        }
    });
}

// general data from coinmarkcap
const getGeneralData = (currency, dom) => {
    let currency_upper = currency.toUpperCase();
    let currency_lower = currency.toLowerCase();
    let api = "https://api.coinmarketcap.com/v1/global/";
    if (currency != '') {
        api += "?convert=" + currency_upper;
    }
    logit("calling " + api);
    $.ajax({
        type: "GET",
        url: api,
        success: function(result) {
            let s = '';
            s += '<table>';
            s += '<tr>';
            s += '<td>' + get_text("total_market_cap_usd", "Total Market Cap USD") + '</td>';
            s += '<td>' + result['total_market_cap_usd'] + '</td>';
            s += '</tr>';
            s += '<tr>';
            s += '<td>' + get_text("total_market_cap_24_usd", 'Total 24 Hour Volumn USD') + '</td>';
            s += '<td>' + result['total_24h_volume_usd'] + '</td>';
            s += '</tr>';
            s += '<tr>';
            s += '<td>' + get_text('bitcoin_percentage', 'Bitcoin Percentage of Market Cap') + '</td>';
            s += '<td>' + result['bitcoin_percentage_of_market_cap'] + '%</td>';
            s += '</tr>';
            s += '<tr>';
            s += '<td>' + get_text('active_currencies', 'Active Currencies') + '</td>';
            s += '<td>' + result['active_currencies'] + '</td>';
            s += '</tr>';
            s += '<tr>';
            s += '<td>' + get_text('active_assets', 'Active Assets') + '</td>';
            s += '<td>' + result['active_assets'] + '</td>';
            s += '</tr>';
            s += '<tr>';
            s += '<td>' + get_text('active_markets', 'Active Markets') + '</td>';
            s += '<td>' + result['active_markets'] + '</td>';
            s += '</tr>';
            s += '<tr>';
            let key1 = "total_market_cap_" + currency_lower;
            if (key1 in result) {
                s += '<tr>';
                s += '<td>' + get_text('total_market_cap', 'Total Market Cap') +' ' + currency_upper + '</td>';
                s += '<td>' + result[key1] + '</td>';
                s += '</tr>';
                s += '<tr>';
            }
            let key2 = "total_24h_volume_" + currency_lower;
            if (key2 in result) {
                s += '<tr>';
                s += '<td>' + get_text('total_24_hour_volumn', 'Total 24 Hour Volumn') + ' ' + currency_upper + '</td>';
                s += '<td>' + result[key2] + '</td>';
                s += '</tr>';
                s += '<tr>';
            }
            s += '<td>' + get_text('last_updated', 'Last Updated') + '</td>';
            s += '<td>' + timestampToString(result['last_updated']) + '</td>';
            s += '</tr>';            
            s += '</table>';
            dom.html(s);
        },
        error: function(request, status, error) {
            logit('Response: ' + request.responseText);
            logit('Error: ' + error );
            logit('Status: ' + status);
        },
        complete: function(data) {
            logit(get_text("api_finished", "API Finished") + ": " + api);
        }             
    }); 
}

// get ranking table from coinmarketcap
const getRankingTable = (currency, dom, limit = 200) => {
    let currency_upper = currency.toUpperCase();
    let currency_lower = currency.toLowerCase();
    let api = "https://api.coinmarketcap.com/v1/ticker/?limit=" + limit;
    if (currency != '') {
        api += "&convert=" + currency_upper;
    }
    logit("calling " + api);
    dom.html('<img src="images/loading.gif" />');
    var up_or_down_img = function(x) {
        if (x >= 0) {
            return "📈" + x;
        } else {
            return "📉" + x;
        }
    }
    $.ajax({
        type: "GET",
        url: api,
        success: function(result) {
            let s = '';
            s += '<table id="ranking" class="sortable">';
            s += '<thead><tr>';
            s += '<th class=sorttable_sorted>' + get_text('coin', 'Coin') + '</th>';
            s += '<th>' + get_text('price_usd', 'Price USD') + '</th>';
            s += '<th>' + get_text('price_btc', 'Price BTC') + '</th>';
            s += '<th>' + get_text('change_1hr', 'Change 1 Hours') + '</th>';
            s += '<th>' + get_text('change_24hr', 'Change 24 Hours') + '</th>';
            s += '<th>' + get_text('change_7days', 'Change 7 Days') + '</th>';
            s += '<th>' + get_text('last_updated', 'Last Updated') + '</th>';
            s += '</tr></thead><tbody>';            
            for (let i = 0; i < result.length; i ++) {
                s += '<tr>';
                s += '<td>' + result[i]['name'] + ' (' + result[i]['symbol'] + ')</td>';
                s += '<td>' + result[i]['price_usd'] + '</td>';
                s += '<td>' + result[i]['price_btc'] + '</td>';
                s += '<td>' + up_or_down_img(result[i]['percent_change_1h']) + '</td>';
                s += '<td>' + up_or_down_img(result[i]['percent_change_24h']) + '</td>';
                s += '<td>' + up_or_down_img(result[i]['percent_change_7d']) + '</td>';
                s += '<td>' + timestampToString(result[i]['last_updated']) + '</td>';
                s += '</tr>';
            }
            s += '</tbody>';
            s += '</table>';
            dom.html(s);
            sorttable.makeSortable(document.getElementById("ranking"));
            // chart
            let data = [];
            let total = 0;
            // 24 hour vol
            let total_24 = 0;
            let data_24 = [];
            for (let i = 0; i < Math.min(15, result.length); i ++) {
                data.push({'coin': result[i]['name'], 'market_cap_usd': result[i]['market_cap_usd']});
                data_24.push({'coin': result[i]['name'], '24h_volume_usd': result[i]['24h_volume_usd']});
                total += parseInt(result[i]['market_cap_usd']);
                total_24 += parseInt(result[i]['24h_volume_usd']);
            }
            api = "https://api.coinmarketcap.com/v1/global/";
            $.ajax({
                type: "GET",
                url: api,
                success: function(result) {       
                    let total_usd = parseInt(result.total_market_cap_usd);
                    let others = total_usd - total;
                    let total_usd_24 = parseInt(result.total_24h_volume_usd);
                    let others_24 = total_usd_24 - total_24;                    
                    data.push({'coin': 'Others', 'market_cap_usd': others});
                    data_24.push({'coin': 'Others', '24h_volume_usd': others_24});
                    let chart = AmCharts.makeChart( "chart_div", {
                        "type": "pie",
                        "theme": "light",
                        "dataProvider": data,
                        "startDuration": 0,
                        "valueField": "market_cap_usd",
                        "titleField": "coin",
                        "balloon":{
                          "fixedPosition": true
                        },
                        "export": {
                          "enabled": false
                        }
                    });   
                    let chart_24 = AmCharts.makeChart( "chart_24_div", {
                        "type": "pie",
                        "theme": "light",
                        "dataProvider": data_24,
                        "startDuration": 0,
                        "valueField": "24h_volume_usd",
                        "titleField": "coin",
                        "balloon":{
                          "fixedPosition": true
                        },
                        "export": {
                          "enabled": false
                        }
                    });                                       
                },
                error: function(request, status, error) {
                    logit('Response: ' + request.responseText);
                    logit('Error: ' + error );
                    logit('Status: ' + status);
                },
                complete: function(data) {
                    logit(get_text("api_finished", "API Finished") + ": " + api);
                }   
            });                               
        },
        error: function(request, status, error) {
            logit('Response: ' + request.responseText);
            logit('Error: ' + error );
            logit('Status: ' + status);
        },
        complete: function(data) {
            logit(get_text("api_finished", "API Finished") + ": " + api);
        }             
    }); 
}

// ajax calling API to return the price of USD for coin
const getPriceOfUSD = (coin) => {
    return new Promise((resolve, reject) => {
        let api = "https://api.coinmarketcap.com/v1/ticker/" + coin + '/';
        fetch(api, {mode: 'cors'}).then(validateResponse).then(readResponseAsJSON).then(function(result) {
            resolve(result[0].price_usd);
        }).catch(function(error) {
            logit('Request failed: ' + api + ": " + error);
            reject(error);
        });
    });
}

// ajax calling API to return the price of currency for 1 BTC
const getPriceOf1BTC = (currency) => {
    return new Promise((resolve, reject) => {
        let api = "https://api.coinmarketcap.com/v1/ticker/bitcoin/?convert=" + currency.toUpperCase();
        fetch(api, {mode: 'cors'}).then(validateResponse).then(readResponseAsJSON).then(function(result) {            
            resolve(result[0]['price_' + currency.toLowerCase()]);
        }).catch(function(error) {
            logit('Request failed: ' + api + ": " + error);
            reject(error);
        });
    });
}

// ajax calling API to return the price of USD for coin
const getPriceOf = (coin, fiat) => {
    return new Promise((resolve, reject) => {
        let api = "https://api.coinmarketcap.com/v1/ticker/" + coin + '/?convert=' + fiat.toUpperCase();
        fetch(api, {mode: 'cors'}).then(validateResponse).then(readResponseAsJSON).then(function(result) {
            resolve(result[0]['price_' + fiat.toLowerCase()]);
        }).catch(function(error) {
            logit('Request failed: ' + api + ": " + error);
            reject(error);
        });
    });
}

// ajax get conversion
const getConversion = async(coin1, coin2) => {
    coin1 = coin1.toUpperCase();
    coin2 = coin2.toUpperCase();
    if (coin1 in coinmarkcap) {
        coin1 = coinmarkcap[coin1];
    }
    if (coin2 in coinmarkcap) {
        coin2 = coinmarkcap[coin2];
    }
    // determine if input is coin or currency
    let is_coin1 = !currency_array.includes(coin1);
    let is_coin2 = !currency_array.includes(coin2);
    // both are coins
    if ((is_coin1) && (is_coin2)) {
        let api1 = getPriceOfUSD(coin1);
        let api2 = getPriceOfUSD(coin2);
        return await api1 / await api2;
    }
    // both are currencies e.g. USD to CNY
    if ((!is_coin1) && (!is_coin2)) {
        let api1 = getPriceOf1BTC(coin1);
        let api2 = getPriceOf1BTC(coin2);
        return await api2 / await api1;
    }
    // converting coin1 to fiat coin2
    if (is_coin1) {
        return await getPriceOf(coin1, coin2);
    } else { // convert coin2 to fiat coin1
        return 1.0 / await getPriceOf(coin2, coin1);
    }
}

// conversion
const processConversion = (s) => {
    let arr = s.trim().split("\n");
    for (let i = 0; i < arr.length; i ++) {
        let pair = arr[i].split(" ");
        if (pair.length == 2) {
            let a = pair[0].trim().toLowerCase();
            let b = pair[1].trim().toLowerCase();
            var pat = /^[a-zA-Z\-]+$/;
            if (pat.test(a) && pat.test(b)) {
                let dom = $('div#conversion_results');
                let dom_id = "convert_" + removeInvalid(a) + "_" + removeInvalid(b);
                dom.append('<div id="' + dom_id + '"> </div>');
                getConversion(a, b).then(x => {
                    $('div#' + dom_id).html("<h4>1 " + a.toUpperCase() + " = <span class=yellow>" + x + "</span> " + b.toUpperCase() + "</h4>");
                });
            }
        }
    }
}

// on document ready
document.addEventListener('DOMContentLoaded', function() {
    // init tabs
    $(function() {
        $( "#tabs" ).tabs();
    });
    // populate currency symbols
    let currency_array_length = currency_array.length;
    for (let i = 0; i < currency_array_length; ++ i) {
        $('select#currency').append($("<option>").attr('value', currency_array[i]).text(currency_array[i]));
        $('datalist#convert_from_list').append($("<option>").attr('value', currency_array[i]).text(currency_array[i]));
        $('datalist#convert_to_list').append($("<option>").attr('value', currency_array[i]).text(currency_array[i]));
    }
    $('datalist#convert_from_list').append($("<option id='source_type_crypto'>").attr('value', '').text(get_text('source_type_crypto')));
    $('datalist#convert_to_list').append($("<option id='target_type_crypto'>").attr('value', '').text(get_text('target_type_crypto')));
    // populate coin symbols
    let coin_array = Object.keys(coinmarkcap);
    let coin_array_length = coin_array.length;
    for (let i = 0; i < coin_array_length; ++ i) {
        let coin_key = coin_array[i];
        let coin = coin_key;
        $('datalist#convert_from_list').append($("<option>").attr('value', coin).text(coin));
        $('datalist#convert_to_list').append($("<option>").attr('value', coin).text(coin));
    }
    // load steem id
    chrome.storage.sync.get('cointools', function(data) {
        if (data && data.cointools) {
            let settings = data.cointools;
            let currency = settings['currency'];
            let lang = settings['lang'];
            let conversion = settings['conversion'];
            $("select#currency").val(currency);
            $("select#lang").val(lang);
            $("textarea#conversion").val(conversion);
            $("input#amount").val(settings['amount']);
            $("input#convert_from").val(settings['convert_from']);
            $("input#convert_to").val(settings['convert_to']);
            processConversion(conversion);
            //general - api https://api.coinmarketcap.com/v1/global/
            getGeneralData(currency, $('div#general_div'));
            // ranking tables - api https://api.coinmarketcap.com/v1/ticker/?convert=EUR&limit=2000
            getRankingTable(currency, $('div#rank_div'));
        } else {
            // first time set default parameters
            // general - api https://api.coinmarketcap.com/v1/global/
            getGeneralData("", $('div#general_div'));
            // ranking tables - api https://api.coinmarketcap.com/v1/ticker/?convert=EUR&limit=2000
            getRankingTable("", $('div#rank_div'));            
            // default conversion
            processConversion($('textarea#conversion').val());
        }
        // about
        let manifest = chrome.runtime.getManifest();    
        let app_name = manifest.name + " v" + manifest.version;
        // version number
        $('textarea#about').val(get_text('application', 'Application') + ': ' + app_name + '\n' + get_text('chrome_version', 'Chrome Version') + ': ' + getChromeVersion());        
        // translate
        ui_translate();
    });
    // save settings when button 'save' is clicked
    $('button#setting_save_btn').click(function() {
        saveSettings();
        // translate
        ui_translate();        
    });
    // convert currency calculator
    $('button#btn_convert').click(function() {
        let amount = $('input#amount').val();
        let a = $('input#convert_from').val();
        let b = $('input#convert_to').val();
        if ((a != '') && (b != '') && (amount >= 0)) {
            getConversion(a, b).then(x => {
                $('textarea#convert_result').append(amount + " " + a.toUpperCase() + " = " + (x * amount) + " " + b.toUpperCase() + "\n");
                let psconsole = $('textarea#convert_result');
                if (psconsole.length) {
                    psconsole.scrollTop(psconsole[0].scrollHeight - psconsole.height());
                }
                saveSettings(false);
            });
        }
    });
}, false);