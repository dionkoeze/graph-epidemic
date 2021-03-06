const ctxPop = document.getElementById('population').getContext('2d');
const chartPop = new Chart(ctxPop, {
    type: 'line',
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            xAxes: [{
                display: true,
                scaleLabel: {
                    display: true,
                    labelString: 'days',
                },
            }],
            yAxes: [{
                display: true,
                scaleLabel: {
                    display: true,
                    labelString: '# people',
                },
            }],
        }
    }
})

const ctxStat = document.getElementById('stats').getContext('2d');
const chartStat = new Chart(ctxStat, {
    type: 'line',
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            xAxes: [{
                display: true,
                scaleLabel: {
                    display: true,
                    labelString: 'days',
                }
            }],
            yAxes: [{
                display: true,
                scaleLabel: {
                    display: true,
                    labelString: 'estimate',
                },
            }],
        }
    }
})

const ctxDist = document.getElementById('degreedist').getContext('2d');
const chartDist = new Chart(ctxDist, {
    type: 'bar',
    data: {
        datasets: [{
            label: 'susceptible',
            backgroundColor: 'rgba(0,200,0,1)',
            data: [],
        }, {
            label: 'infected',
            backgroundColor: 'rgba(200,0,0,1)',
            data: [],
        }, {
            label: 'removed',
            backgroundColor: 'rgba(0,150,150,1)',
            data: [],
        }],
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            xAxes: [{
                display: true,
                stacked: true,
                scaleLabel: {
                    display: true,
                    labelString: '# friends',
                },
            }],
            yAxes: [{
                display: true,
                stacked: true,
                scaleLabel: {
                    display: true,
                    labelString: '# people',
                },
            }],
        }
    }
})

let population, stats;

function regenPopulation() {
    let matcherFunc;

    if (matcher === 'random') {
        matcherFunc = randomMatcher;
    } else if (matcher === 'grid1d') {
        matcherFunc = grid1DMatcher;
    } else if (matcher === 'grid2d') {
        matcherFunc = grid2DMatcher;
    } else if (matcher === 'grid3d') {
        matcherFunc = grid3DMatcher;
    } else if (matcher === 'watts') {
        matcherFunc = wattsStrogatzMatcher;
    } else if (matcher === 'ring') {
        matcherFunc = ringMatcher;
    } else if (matcher === 'community') {
        matcherFunc = communityRandomMatcher;
    }

    population = new Population(populationSize, matcherFunc);
    resetPopulation();

    // cy.json(constructCyElems(population.individuals));
    cy.elements().remove();
    cy.add(constructCyElems(population.individuals));
    cy.nodes().classes('susceptible');
    let layout = cy.layout({
        name: 'circle',
    });
    layout.run();
    cy.fit();
}

function resetPopulation() {
    population.epoch = 0;
    population.individuals.forEach(individual => {
        individual.infectedEpoch = undefined;
        individual.infectCount = 0;
    });
    for (let i = 0; i < initial; i++) {
        population.individuals[i].infectedEpoch = 0;
    }
    stats = population.computeStats();

    cy.nodes().classes('susceptible');
}

function resetCharts() {
    resetStats();

    chartPop.data.labels = [0];
    chartPop.data.datasets = [{
        label: 'susceptible',
        backgroundColor: 'rgba(0,0,0,0)',
        borderColor: 'rgba(0,200,0,1)',
        data: [stats.susceptible],
    }, {
        label: 'infected',
        backgroundColor: 'rgba(0,0,0,0)',
        borderColor: 'rgba(200,0,0,1)',
        data: [stats.infected],
    }, {
        label: 'removed',
        backgroundColor: 'rgba(0,0,0,0)',
        borderColor: 'rgba(150,150,150,1)',
        data: [stats.removed],
    }];

    chartStat.data.labels = [0];
    chartStat.data.datasets = [{
        label: 'criticality',
        backgroundColor: 'rgba(0,0,0,0)',
        borderColor: 'rgba(200,0,0,1)',
        data: [stats.Reff],
    }, {
        label: 'Reff',
        backgroundColor: 'rgba(0,0,0,0)',
        borderColor: 'rgba(0,0,200,1)',
        data: [stats.Reff],
    }];

    chartPop.update({duration: 0});
    chartStat.update({duration: 0});

    const degrees = population.computeDegrees()
    chartDist.data.datasets[0].data = degrees.susceptible;
    chartDist.data.datasets[1].data = degrees.infected;
    chartDist.data.datasets[2].data = degrees.removed;
    chartDist.data.labels = [...Array(degrees.max).keys()];
    chartDist.update({duration: 0});
}

function resetStats() {
    $('#infectedPeak').text(0);
}

function updateStats(stats, degrees) {
    let peak = parseInt($('#infectedPeak').text())
    if (stats.infected > peak) {
        $('#infectedPeak').text(`${stats.infected} (${asPercentage(stats.infected)}%)`);
    }

    $('#removedTotal').text(`${stats.removed} (${asPercentage(stats.removed)}%)`);
    $('#uninfectedTotal').text(`${stats.susceptible} (${asPercentage(stats.susceptible)}%)`);

    $('#all-avg').text(rounded(average(degrees.all)));
    $('#all-med').text(rounded(median(degrees.all)));
    $('#all-mod').text(rounded(mode(degrees.all)));
    $('#sus-avg').text(rounded(average(degrees.susceptible)));
    $('#sus-med').text(rounded(median(degrees.susceptible)));
    $('#sus-mod').text(rounded(mode(degrees.susceptible)));
    $('#inf-avg').text(rounded(average(degrees.infected)));
    $('#inf-med').text(rounded(median(degrees.infected)));
    $('#inf-mod').text(rounded(mode(degrees.infected)));
    $('#rem-avg').text(rounded(average(degrees.removed)));
    $('#rem-med').text(rounded(median(degrees.removed)));
    $('#rem-mod').text(rounded(mode(degrees.removed)));
}

function iteration() {
    population.nextEpoch();
    $('#epoch').text(population.epoch);
    const stats = population.computeStats();

    chartPop.data.labels.push(population.epoch);
    chartStat.data.labels.push(population.epoch);

    chartPop.data.datasets[0].data.push(stats.susceptible);
    chartPop.data.datasets[1].data.push(stats.infected);
    chartPop.data.datasets[2].data.push(stats.removed);
    chartPop.update({duration: 0});
    
    chartStat.data.datasets[0].data.push(1);
    // let Reff lag behind because it is measured in patients that are removed
    if (population.epoch > duration) {
        chartStat.data.datasets[1].data.push(stats.Reff);
    }
    chartStat.update({duration: 0});

    const degrees = population.computeDegrees()
    chartDist.data.datasets[0].data = degrees.susceptible;
    chartDist.data.datasets[1].data = degrees.infected;
    chartDist.data.datasets[2].data = degrees.removed;
    chartDist.data.labels = [...Array(degrees.max+1).keys()];
    chartDist.update({duration: 0});

    updateStats(stats, degrees);

    if (stats.infected > 0) {
        setTimeout(iteration, delay);
    }
}

$('#size').val(populationSize);
$('#drawsize').val(shownNodes);
$('#connectivity').val(connectivity);
$('#network').val(matcher);
$('#rate').val(infectionRate);
$('#duration').val(duration);
$('#initial').val(initial);
$('#delay').val(delay)

function readParams() {
    populationSize = parseInt($('#size').val());
    shownNodes = parseInt($('#drawsize').val());
    infectionRate = parseFloat($('#rate').val());
    duration = parseInt($('#duration').val());
    connectivity = parseFloat($('#connectivity').val());
    initial = parseInt($('#initial').val());
    delay = parseInt($('#delay').val());
    matcher = $('#network').val();
}

$('#regen').click(function() {
    readParams();
    regenPopulation();
    resetCharts();
    setTimeout(iteration, 0);
});

$('#start').click(function() {
    readParams();
    resetPopulation();
    resetCharts();
    setTimeout(iteration, 0);
});

$('#log').click(function() {
    if ($('#log').prop('checked')) {
        chartPop.options.scales.yAxes[0].type = 'logarithmic';
        chartDist.options.scales.yAxes[0].type = 'logarithmic';
    } else {
        chartPop.options.scales.yAxes[0].type = 'linear';
        chartDist.options.scales.yAxes[0].type = 'linear';
    }

    chartPop.update({duration: 0});
    chartDist.update({duration: 0});
})

regenPopulation();
resetCharts();
setTimeout(iteration, 0);