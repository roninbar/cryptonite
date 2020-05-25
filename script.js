$(function () {

    const maxAllowed = 5;

    let intervalId = 0;

    const chart = Highcharts.chart('chart', {
        chart: {
            type: 'spline',
            animation: Highcharts.svg,
            marginRight: 10
        },
        time: {
            useUTC: false
        },
        title: {
            text: 'Exchange Rates'
        },
        accessibility: {
            announceNewData: {
                enabled: true,
                minAnnounceInterval: 15000,
                announcementFormatter: function (allSeries, newSeries, newPoint) {
                    if (newPoint) {
                        return 'New point added. Value: ' + newPoint.y;
                    }
                    return false;
                }
            }
        },
        xAxis: {
            type: 'datetime',
            tickPixelInterval: 150
        },
        yAxis: {
            type: 'logarithmic',
            title: {
                text: 'USD'
            },
            plotLines: [{
                value: 0,
                width: 1,
                color: '#808080'
            }]
        },
        tooltip: {
            headerFormat: '<b>{series.name}</b><br/>',
            pointFormat: '{point.x:%Y-%m-%d %H:%M:%S}<br/>${point.y:.4f}'
        },
        legend: {
            align: 'center',
            verticalAlign: 'top',
            borderWidth: 1
        },
        exporting: {
            enabled: false
        }
    });

    $('#cards').empty();

    $('#home-tab').on('show.bs.tab', function () {
        $('#search').show();
    });

    $('#home-tab').on('hide.bs.tab', function () {
        $('#search').hide();
    });

    $('#reports-tab').on('show.bs.tab', async function (e) {

        const fsyms = $('.card:has(:checkbox:checked) .card-title')
            .map(function () {
                return $(this).text().toUpperCase();
            })
            .get();

        if (fsyms.length > 0) {

            const prices = await fetch(`https://min-api.cryptocompare.com/data/pricemulti?fsyms=${fsyms.join(',')}&tsyms=usd`)
                .then(res => res.json());
            const now = Date.now();
            for (let i = 0; i < fsyms.length; i++) {
                if (prices[fsyms[i]]) {
                    chart.addSeries({
                        id: fsyms[i],
                        name: fsyms[i],
                        data: [{
                            x: now,
                            y: prices[fsyms[i]]['USD'],
                        }],
                    });
                }
            }

            intervalId = setInterval(async function () {
                if (fsyms.length > 0) {
                    const prices = await fetch(`https://min-api.cryptocompare.com/data/pricemulti?fsyms=${fsyms.join(',')}&tsyms=usd`)
                        .then(res => res.json());
                    const now = Date.now();
                    for (let i = 0; i < fsyms.length; i++) {
                        const series = chart.get(fsyms[i]);
                        if (series) {
                            series.addPoint([now, prices[fsyms[i]]['USD']], true, series.data.length >= 30);
                        }
                    }
                }
            }, 2000);
        }

    });

    $('#reports-tab').on('hide.bs.tab', function () {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = 0;
        }
        while (chart.series.length > 0) {
            chart.series[0].remove();
        }
    });

    $('#search').on('input', function ({ target }) {
        const substr = $(target).val().toLowerCase();
        $('#cards').children().hide();
        $('#cards').children().filter(function () {
            return $(this).text().toLowerCase().includes(substr);
        }).show();
    });

    $('#too-many-coins').on('show.bs.modal', function () {
        $('#selected-coins').empty();
        $('#cards .card:has(:checkbox:checked)').each(function () {
            const [, id] = $(':checkbox', this).attr('id').match(/select-(.*)/);
            const symbol = $('.card-title', this).text();
            const inputGroup = $(`
                <div class="input-group w-auto mx-2 my-2">
                    <div class="input-group-prepend">
                        <div class="input-group-text">
                            <div class="custom-control custom-switch">
                                <input type="checkbox" class="custom-control-input" id="selected-${id}" checked>
                                <label for="selected-${id}" class="custom-control-label"></label>
                            </div>
                        </div>
                    </div>
                    <div class="input-group-append">
                        <label for="selected-${id}" class="input-group-text text-uppercase">${symbol}</label>
                    </div>
                </div>`);
            $(':checkbox', inputGroup).change(function () {
                $(`#select-${id}`).prop('checked', $(this).prop('checked'));
                $('#too-many-coins form :submit').prop('disabled', $('#cards :checkbox:checked').length >= maxAllowed);
            });
            $('#selected-coins').append(inputGroup);
        });
    });

    /**
     * The id of the coin that triggered the modal.
     */
    let triggerId = '';

    $('#too-many-coins').on('hide.bs.modal', function () {
        if (!$(`#select-${triggerId}`).prop('checked')) {
            const checkboxes = $('#selected-coins :checkbox');
            checkboxes.prop('checked', true);
            checkboxes.change();
        }
    });

    $('#too-many-coins form').submit(function (e) {
        e.preventDefault();
        $(`#select-${triggerId}`).prop('checked', true);
        $('#too-many-coins').modal('hide');
    });

    function showModal(checkbox) {
        [, triggerId] = checkbox.id.match(/select-(.*)/);
        const card = $(checkbox).closest('.card');
        const symbol = $('.card-title', card).text();
        const tooMany = $('#too-many-coins');
        $('.modal-title', tooMany).text(`You cannot select more than ${maxAllowed} coins. To select ${symbol.toUpperCase()}, first de-select one or more of the following:`);
        $('form :submit', tooMany).text(`Select ${symbol.toUpperCase()}`);
        $('form :submit', tooMany).prop('disabled', true);
        setTimeout(tooMany.modal.bind(tooMany, 'show'), 0);
    }

    $.getJSON('https://api.coingecko.com/api/v3/coins').done(function (coins) {

        $('#cards').empty();

        $('#cards').append(coins.slice(0, 100).map(({ id, name, symbol }) => $(`
            <div class="card col-sm-6 col-md-4 col-lg-3 col-xl-2">
                <label for="select-${id}" class="card-body">
                    <h5 class="card-title text-uppercase">${symbol}</h5>
                    <div class="custom-control custom-switch" style="position: absolute; top: 22px; right: 25px;">
                        <input type="checkbox" class="custom-control-input" id="select-${id}">
                        <label class="custom-control-label" for="select-${id}"></label>
                    </div>
                    <p>${name}</p>
                    <button type="button" class="btn btn-primary" data-toggle="collapse" data-target="#more-info-${id}">
                        More Info
                    </button>
                    <div class="collapse mt-4 more-info" id="more-info-${id}">
                        <div class="card border-primary p-4" style="border-radius: 200em 200em 0 0;">
                            <img class="card-img-top img-thumbnail rounded-circle border-dark" src="img/dollar.gif" />
                            <div class="card-body d-flex flex-column align-items-center">
                                <div class="spinner-grow"></div>
                                <div class="spinner-grow"></div>
                                <div class="spinner-grow"></div>
                            </div>
                        </div>
                    </div>
                </label>
            </div>`)));

        $('#cards :checkbox').click(function (e) {
            if ($('#cards :checkbox:checked').length > maxAllowed) {
                e.preventDefault();
                showModal(e.target);
            }
        });

        $('#cards .more-info').on('shown.bs.collapse', function ({ target }) {
            const [, id] = target.id.match(/more-info-(.*)/);
            getMoreInfo(id).done(function ({
                    image: {
                        large: imageUrl
                    },
                    market_data: {
                        current_price: {
                            usd,
                            gbp,
                            ils
                        }
                    }
                }) {
                    const cardImg = $('.card-img-top', target);
                    cardImg.attr('src', imageUrl);
                    const cardBody = $('.card-body', target);
                    cardBody.empty();
                    cardBody.append(`<h5 class="card-text">&dollar;${usd}</h5>`);
                    cardBody.append(`<h5 class="card-text">&pound;${gbp}</h5>`);
                    cardBody.append(`<h5 class="card-text">&#8362;${ils}</h5>`);
                });
        });

        function getMoreInfo(id) {
            return $.getJSON(`https://api.coingecko.com/api/v3/coins/${id}?tickers=false&community_data=false&developer_data=false`);
        }

    });

});

