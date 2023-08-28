module.exports = function(grunt) {
    // read in from config file and allow overrides from command line arguments
    let conf = require('./.screeps.json')
    let branch = grunt.option('branch') || conf.branch
    let email = grunt.option('email') || conf.email
    let token = grunt.option('token') || conf.token
    let season = grunt.option('season') || conf.season

    grunt.loadNpmTasks('grunt-screeps');

    // construct options
    opts = {
        email: email,
        token: token,
        branch: branch
    }

    // if season is true, use the season server
    if (season === true) {
        opts.server = 'season'
    }

    // initialize the grunt config for screeps
    grunt.initConfig({
        screeps: {
            options: opts,
            dist: {
                src: ['dist/*.js']
            }
        }
    });
}