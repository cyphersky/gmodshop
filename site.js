function bodyFormatting() {
    $(".body-formatting").each(function (k, v) {
        format($(this));
    })
}

function progress(num) {
    $(".form-upload .loading-inner").attr('style', 'width: ' + num + '%');
}

function format(element) {
    if (element.attr("formatted") == undefined) {

        var text = element.text()

        element.html(formatMe(text))

        element.attr("formatted", true)
    }
}

function formatMe(raw) {
    raw = raw.split(/(\r\n|\n|\r)/gm)
    console.log(raw)
    var str = ""


    $.each(raw, function (i, line) {
        var args = line.split(" ")

        args = formatArguments(args)

        var formatted = args["body"].join(" ")

        // remove script tags
        formatted = formatted.replace(/(<|%3C)script[\s\S]*?(>|%3E)[\s\S]*?(<|%3C)(\/|%2F)script[\s\S]*?(>|%3E)/gi, '')

        str += formatted + "\n"

    })

    return marked(str)
}

function formatArguments(arr) {
    var obj = {};
    obj["listing"] = false
    obj["br"] = true
    $.each(arr, function (i, text) {
        var youtube = /^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
        console.log(text)
        if (youtube.test(text)) {
            var url = text.split("?v=")[1];
            arr[i] = '<div class="video-wrapper"><iframe src="https://www.youtube.com/embed/' + url + '" frameborder="0" allowfullscreen></iframe> </div>'
        }
    })
    obj["body"] = arr
    return obj
}

function arrTagWrap(tag, arr) {
    arr = ["<" + tag + ">", ...arr, "</" + tag + ">"]
    return arr
}

function nonAlphaNumeric(text, seperator) {
    return text.replace(/([^a-zA-Z0-9])/g, seperator).toLowerCase();
}

function drawGraph(labels, data_sets, start_zero) {
    if (start_zero == undefined) {
        start_zero = true;
    }
    var ctx = document.getElementById('myChart').getContext('2d');
    var myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: data_sets
        },
        options: {
            elements: {
                point: {
                    radius: 0
                }
            },
            respsonive: true,
            tooltips: {
                mode: 'index',
                intersect: false,
            },
            hover: {
                mode: 'nearest',
                intersect: true
            },
            legend: {
                display: true,
            },
            scales: {
                xAxes: [{
                    type: 'time',
                    distribution: 'linear',
                    gridLines: {
                        drawBorder: false,
                        display: false,
                    },
                    ticks: {
                        autoSkip: true,
                        reverse: true,
                        fontSize: 13,
                        minRotation: 0,
                        maxRotation: 0,
                        source: 'auto'
                    },
                    time: {
                        parser: 'MM/DD/YYYY HH:mm',
                        isoWeekday: false,
                        unit: 'day',
                        unitStepSize: 1,
                        color: "rgb(187, 182, 191)",
                        displayFormats: {
                            'day': 'D MMM'
                        }
                    },
                }],
                yAxes: [{
                    display: true,
                    gridColor: "rgb(59, 59, 59)",
                    zeroLineWidth: 0,
                    ticks: {
                        beginAtZero: start_zero
                    }
                }]
            }
        }
    });
}

function simplePost(url, target, append, refresh = false, data) {
    $(target).html('<i class="fas fa-circle-notch fa-spin"></i>');
    if (refresh) {
        location.reload();
    }
    $.ajax({
        url: url,
        crossDomain: true,
        data: data,
        type: "POST",
        contentType: 'application/json; charset=utf-8',
        success: function (response) {
            console.log(response);
            $(target).html(append + response);
            if ($(target).hasClass("btn")) {
                $(target).removeClass("btn-danger");
                $(target).addClass("btn");
                $(target).addClass("btn-success");
            } else {
                $(target).addClass("text-success")
                $(target).removeClass("text-danger")
            }
            
            if (refresh) {
                location.reload();
            }

            return response;
        },
        error: function (response) {
            console.log(response);
            $(target).html(append + response.responseText);
            if (message.length == 0 || message.length > 500)
                $(target).text("Error");

            if ($(target).hasClass("btn")) {
                $(target).removeClass("btn-success");
                $(target).addClass("btn");
                $(target).addClass("btn-danger");
            } else {
                $(target).addClass("text-danger")
                $(target).removeClass("text-success")
            }
           
            return false;
        }
    });
}


$(".general-form").submit(function (e) {
    e.preventDefault();

    var data = $(this).serializeArray().reduce(function (obj, item) {
        if (item.name == 'g-recaptcha-response')
            item.name = 'captcha';
        obj[item.name] = item.value;
        return obj;
    }, {})

    if (data['captcha']) {
        if (data['captcha'].length == 0) {
            formMsg(this, false, "Please complete the captcha");
            return false;
        }
    }

    $("html, body").animate({ scrollTop: 0 }, "slow");

    formMsg(this, null);

    $.ajax({
        url: $(this).attr("form-url"),
        crossDomain: true,
        type: "POST",
        data: JSON.stringify(data),
        contentType: 'application/json; charset=utf-8',
        success: function (response) {
            if (response.length > 0) {
                formMsg(this, true, response)
            } else {
                formMsg(this, true, "Success")
            }
            console.log('URL',this.url)

    		if (data['message']) {
    		    if (data['message'].length == 0 || data['message'].length > 500) {
    		    	formMsg(this, false, "Символов не должно быть больше 500")
    		    	return false
    		    } else {
    		    	formMsg(this, null, "Уга буга")
    		    	window.location.reload();
    		    }
    		}

            if (this.url == "/authenticate") {
                eraseCookie('sid')
                if (data['remember'] != undefined) {
                    setCookie('sid', response, 3650)
                } else {
                    setCookie('sid', response, 1)
                }
                response = "Logging you in now!";
                formMsg(this, true, response)
            }
            if ($("form").attr("form-redirect") != undefined) {
                progress(0)
                var redirect_time = 5;
                var redirect_url = $("form").attr("form-redirect")
                if (redirect_url == "get_response") {
                    redirect_url = response
                    formMsg(this, true, "Success!")
                } else {
                    formMsg(this, true, response)
                }
                if ($("form").attr("form-fancy") != undefined) {
                    redirect_time = $("form").attr("form-fancy");
                }
                fancyRedirect(response, redirect_time, redirect_url)
            }
        },
        error: function (response) {
            if (response.responseText.length > 500 && $("form").attr("showallerrors") == undefined) {

                formMsg(this, false, 'Critical error, contact staff')
            } else {
                formMsg(this, false, response.responseText)
            }
            if (typeof grecaptcha !== 'undefined') {
                grecaptcha.reset();
            }
        }
    });
});

function time() {
    return parseInt(new Date().getTime() / 1000);
}

function progress(num) {
    $(".form-upload .loading-inner").attr('style', 'width: ' + num + '%');
}

function logout() {
    let yes = confirm("Вы уверены что хотите выйти?");
    if (yes) {
        eraseCookie('sid');
        fancyRedirect("You are being logged out", 3, "/logout")
        window.location.href = '/logout';
    }
}

function safeLinks() {

    Array.from(document.querySelectorAll('a')).forEach(a => {
        var pattern = /^(http|https)?:\/\/[a-zA-Z0-9-\.]+\.[a-z]{2,4}/;
        // is full link (e.g. https://gmodaddons.com or https://google.com, ignores /home etc)
        if (pattern.test($(a).attr("href"))) {
            if($(a).attr("href").includes(window.location.origin) ? 'local' : 'external') {
                $(a).attr("target", "_blank")
            }
        }
    });
}

function fitFooter() {
    var body = document.body.clientHeight;
    var client = $(window).height();
    var footer = $('footer').height();

    if (body < client) {
        $(".footer").css("position", "absolute")
        $(".footer").css("bottom", "0")
        $("body").css("padding-bottom", client - footer)
    }
}

function setCookie(name, value, days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}
function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}
function eraseCookie(name) {
    document.cookie = name + '=; Max-Age=-99999999;';
}

function formMsg(parent, error, message) {
    var obj = $(parent).children("#form-response");
    obj.html('<div class="alert"></div>')
    var alert = $("#form-response > .alert");
    obj.addClass("form-group");
    alert.html(message)
    if (error) {
        if (message.length == 0 || message.length > 500)
            alert.text("Успешно")
        alert.addClass("alert-success");
        alert.removeClass("alert-danger");
        // window.location.reload();
    } else if (error == null) {
        alert.html('<i class="fas fa-cog fa-spin"></i>');
        alert.removeClass("alert-success");
        alert.removeClass("alert-danger");
    } else {
        if (message.length == 0)
            alert.text("Success")
        alert.addClass("alert-danger");
        alert.removeClass("alert-success");
    }
}

$(".form-upload").submit(function (e) {
    e.preventDefault();

    var formData = new FormData(this);
    $("html, body").animate({ scrollTop: 0 }, "slow");

    console.log(formData)

    formMsg(this, true, "Uploading...");

    var start = time()

    $.ajax({
        xhr: function () {
            var xhr = new window.XMLHttpRequest();
            xhr.upload.addEventListener("progress", function (evt) {
                if (evt.lengthComputable) {
                    progress((evt.loaded / evt.total) * 100)
                    console.log(time())
                    console.log(start)

                    var timepassed = (time() - start)

                    $("#uploadmsg").html('<div class="mt-2 mb-2 text-center">Estimated ' + timeAgo(((time() - timepassed) + Math.round(timepassed / (evt.loaded / evt.total)))) + ' remaining </div>');

                    if ((evt.loaded / evt.total) == 1) {
                        if ((time() - start) > 2)
                            formMsg(this, true, 'Processing...')
                            fancyRedirect('Загрузка', 5, location.href)
                    }
                }
            }, false);
            return xhr;
        },
        url: $(this).attr("form-url"),
        timeout: 7200000,
        type: "POST",
        data: formData,
        processData: false,
        contentType: false,
        success: function (response) {
            $("#uploadmsg").html('');

            progress(0)
            var redirect_url = $("form").attr("form-redirect")
            if (redirect_url == "get_response") {
                redirect_url = response
                formMsg(this, true, "Success!")
            } else {
                formMsg(this, true, response)
            }
            fancyRedirect(response, 5, redirect_url)
        },
        error: function (response) {
            $("#uploadmsg").html('');

            console.log($("form").attr("showallerrors"))

            progress(0)
            if (response.responseText.length > 500 && $("form").attr("showallerrors") == undefined) {
                formMsg(this, false, 'Critical error, contact staff')
            } else {
                formMsg(this, false, response.responseText)
            }
            if (typeof grecaptcha !== 'undefined') {
                grecaptcha.reset();
            }
        }

    });
});

function fancyRedirect(body, time, url) {

    var redirect = false;
    if (url != undefined) {
        redirect = true;
    }

    // is not a full link
    if (!(url.indexOf("//") >= 0)) {
        url = "http://" + window.location.host + url
    }

    $(".fancy-modal").modal("show")

    $(".fancy-modal .modal-body").html(body);
    $(".fancy-modal .modal-body").append('<span class="loading-dots"></span>');
    $(".fancy-modal .modal-footer").append('<div class="loading-bar"><div class="loading-inner"></div></div>');

    console.log(redirect)
    console.log(url)

    $('.fancy-modal').on('hidden.bs.modal', function () {
        if (redirect) {
            window.location.replace(url);
        }
    })

    var fancyTimer = time * 1000;
    $(".fancy-modal .loading-inner").css("transition", "width " + time + "s ease-in-out");


    var fancyInterval = setInterval(function () {
        fancyTimer -= 1000
        $(".fancy-modal .modal-button").text("Redirecting in " + fancyTimer / 1000 + "s");
    }, 1000)
    $(".fancy-modal .modal-button").text("Redirecting in " + fancyTimer / 1000 + "s");

    setTimeout(function () {
        $(".fancy-modal .loading-inner").css("width", "100%");
    }, 500)

    setTimeout(function () {
        $(".fancy-modal").modal("hide")
        clearInterval(fancyInterval);
    }, time * 1000)
}

window.onload = function () {
    //Check File API support
    if (window.File && window.FileList && window.FileReader) {
        $('#imgfiles').on("change", function (event) {
            var files = event.target.files;
            $("#result").html("<div class=\"sortables\"></div>");
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                if (file.type.match('image.*')) {
                    if (this.files[0].size < 4197152) {
                        var picReader = new FileReader();
                        picReader.addEventListener("load", function (event) {
                            var picFile = event.target;
                            $("#result > .sortables").append("<img class='thumbnail p-2 tippy' data-tippy-content='Upload your images before sorting images' src='" + picFile.result + "'" + " />");
                        });
                        $('#clear, #result').css('display', 'block');
                        picReader.readAsDataURL(file);
                    } else {
                        alert("Image Size is too big. Minimum size is 3MB.");
                        $(this).val("");
                    }
                } else {
                    alert("You can only upload image file.");
                    $(this).val("");
                }
            }
            setTimeout(function () {
                tippy('.tippy');
            }, 100)
        });
    }
    else {
        console.log("Your browser does not support File API");
    }
}

$(function () {
    $(".sortables").sortable();
});

$(".item-image-thumb").on("click", function () {
    $(".main-addon-img").css("background-image", $(this).css("background-image"))
    $(".main-addon-img-lightbox").attr("href", $(this).attr("link-url"))
})

$(document).on('click', '[data-toggle="lightbox"]', function (event) {
    event.preventDefault();
    $(this).ekkoLightbox();
})

$('#imgfiles').on("click", function () {
    $('#result').hide();
    $(this).val("");
});

$('#clear').on("click", function () {
    $('#result').hide();
    $('#imgfiles').val("");
    $(this).hide();
});

$('#buyfunc').on("click", function () {
    $('#form-response').html('<div class="bg-danger p-3 text-center text-white">У вас недостаточно средств на балансе<br />Пополните счет на сайте</div>');
});

function notifications(number) {
    if (number > 0) {
        $(".notification-circle").html('<div class="tippy" data-tippy-content="' + number + ' unread notifications"><i class="fas fa-bell"></i><div class="notification-number"></div></div>')
        tippy('.tippy');
    }
}

$(document).ready(function () {
    fitFooter();
    bodyFormatting();
    safeLinks();
    if (getCookie("sid") != undefined) {
        $.ajax({
            url: "/api/auth",
            crossDomain: true,
            type: "POST",
            contentType: 'application/json; charset=utf-8',
            success: function (response) {
                if (response == "logout") {
                    eraseCookie("sid")
                    fancyRedirect("Your login session is no longer valid", 3, window.location.pathname)
                } else {
                    try {
                        response = JSON.parse(response);
                    } catch (e) {
                        alert(e);
                    }
                    console.log(response)
                    console.log(typeof response)
                    console.log(typeof response == "object")
                    if (typeof response == "object") {
                        var json = response
                        if (json["banned"] == true) {
                            console.log(json);
                            console.log("main replace");
                            $('body').prepend('<div class="bg-danger p-3 text-center text-white">You\'re currently banned, reason: <b>' + json["reason"] + '</b><br />Ban expires in <span class="timeago" time="' + json["expires"] + '"></span></div>');
                        }
                    } else {
                        notifications(response);
                    }
                }
            }
        });
    }

    console.log(getCookie("gmodshopcookies"))

    if (getCookie("gmodshopcookies") == undefined) {
        $("#allowcookies").css('display', 'block');
    }

    $.each($("*"), function () {
        if ($(this).css("background-image") != undefined) {
            if (~$(this).css("background-image").indexOf("garry.gmodaddons.com")) {
                // try secondary cdn
                //$(this).css("background-image", $(this).css("background-image") + ", " + $(this).css("background-image").replace("garry.gmodaddons.com", "gmodaddons.sfo2.digitaloceanspaces.com"))
            }
        }
    });

    tippy('.tippy');
});


$(window).resize(function () {
    fitFooter();
});

function timeAgo(time) {
    var seconds = parseInt(new Date().getTime() / 1000) - time;
    if (time > parseInt(new Date().getTime() / 1000))
        seconds = seconds * -1;
    var years;
    var days;
    var hours;
    if (seconds > 60) {
        if (seconds > 3600) {
            if (seconds > 86400) {
                if (seconds > 31536000) {
                    years = parseInt(seconds / 31536000);
                    days = parseInt((seconds - (31536000 * years)) / 86400);
                    return years + "г " + days + "д";
                } else {
                    days = parseInt(seconds / 86400);
                    hours = parseInt((seconds - (86400 * days)) / 3600);
                    return days + "д " + hours + "ч";
                }
            } else {
                hours = parseInt(seconds / 3600);
                seconds = parseInt((seconds - (3600 * hours)) / 60);
                return hours + "ч " + seconds + "м";
            }
        } else {
            minutes = parseInt(seconds / 60);
            seconds = parseInt(seconds - (60 * minutes));
            return minutes + "м " + seconds + "с";
        }
    } else {
        return Math.round(seconds) + " с";
    }
}


function timeInterval() { $(".timeago").each(function (t, e) { null != $(this).attr("time") && "" != $(this).attr("time") || $(this).attr("time", $(this).text()), $(this).text(timeAgo($(this).attr("time"))) }) } timeInterval(), setInterval(timeInterval, 1e3);