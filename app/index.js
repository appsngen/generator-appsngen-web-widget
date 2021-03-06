(function () {
    'use strict';

    /*globals require, console, module, process*/

    var yeoman = require('yeoman-generator');
    var chalk = require('chalk');
    var yosay = require('yosay');
    var mkdirp = require('mkdirp');
    var path = require('path');
    var _s = require('underscore.string');

    var copyFiles = function (generator, files) {
        var i;

        for (i = 0; i < files.length; i++) {
            generator.fs.copy(
                generator.templatePath(files[i]),
                generator.destinationPath(files[i])
            );
        }
    };

    var copyTemplates = function (generator, templates, data) {
        var i, template, templatePath, templateName, compiledName;

        for (i = 0; i < templates.length; i++) {
            template = templates[i];
            templatePath = path.dirname(template);
            templateName = path.basename(template);
            compiledName = templateName.substring(1); // remove leading _ symbol

            generator.fs.copyTpl(
                generator.templatePath(path.join(templatePath, templateName)),
                generator.destinationPath(path.join(templatePath, compiledName)),
                data
            );
        }
    };

    // copyFiles doesn't create empty folders so we need to create them manually
    var createDirectories = function (directoryNames) {
        var i, directoryName;

        for (i = 0; i < directoryNames.length; i++) {
            directoryName = directoryNames[i];

            mkdirp.sync(directoryName);
            // make output similar to yeoman's
            console.log('   ' + chalk.green('create') + ' ' + directoryName.replace('/', '\\') + '\\');
        }
    };

    module.exports = yeoman.generators.Base.extend({
        constructor: function () {
            yeoman.generators.Base.apply(this, arguments);

            this.argument('path', {
                type: String,
                optional: true,
                defaults: '.'
            });
            this.argument('name', {
                type: String,
                optional: true,
                defaults: ''
            });
            try {
                this.path = path.resolve(this.path);
                mkdirp.sync(path.resolve(this.path));
                process.chdir(path.resolve(this.path));
            } catch (err) {
                console.error(err.toString());
                process.exit(1);
            }
        },
        prompting: function () {
            var done = this.async();
            var that = this;

            // Have Yeoman greet the user.
            this.log(yosay(
                'You\'re using the ' + chalk.red('AppsNgen Web Widget') + ' generator.'
            ));

            var prompts = [
                {
                    when: function () {
                        return !that.name.trim();
                    },
                    validate: function (input) {
                        return Boolean(input.trim());
                    },
                    name: 'widgetName',
                    message: 'Enter widget name: ',
                    default: this.name
                },
                {
                    name: 'widgetDescription',
                    message: 'Enter widget description:',
                    default: this.name + ' description'
                },
                {
                    name: 'enablePreferencesSupport',
                    message: 'Include preferences usage example',
                    type: 'confirm',
                    default: true
                },
                {
                    name: 'enableEventsSupport',
                    message: 'Include events usage example:',
                    type: 'confirm',
                    default: true
                },
                {
                    name: 'enableDataSourceSupport',
                    message: 'Include data sources usage example:',
                    type: 'confirm',
                    default: true
                },
                {
                    when: function (props) {
                        return props.enableDataSourceSupport;
                    },
                    name: 'enableQuotesSupport',
                    message: 'Include quotes data source usage example:',
                    type: 'confirm',
                    default: true
                },
                {
                    when: function (props) {
                        return props.enableDataSourceSupport;
                    },
                    name: 'enableTimeSeriesSupport',
                    message: 'Include time series data source usage example:',
                    type: 'confirm',
                    default: true
                },
                {
                    when: function (props) {
                        return props.enableDataSourceSupport;
                    },
                    name: 'enableNewsSupport',
                    message: 'Include news data source usage example:',
                    type: 'confirm',
                    default: true
                }
            ];

            this.prompt(prompts, function (props) {
                this.props = props;
                this.props.widgetName = this.props.widgetName || that.name;
                this.props.widgetId = _s.slugify(this.props.widgetName);

                done();
            }.bind(this));
        },
        writing: {
            projectFiles: function () {
                var packageInfo = {
                    name: this.props.widgetId, // package name same as widget id
                    description: this.props.widgetDescription,
                    includeCodeMirror: Boolean(this.props.enableEventsSupport) ||
                    Boolean(this.props.enableDataSourceSupport)
                };

                copyFiles(this, [
                    'Gruntfile.js',
                    'LICENSE',
                    'README.md'
                ]);
                copyTemplates(this, [
                    '_package.json',
                    '_bower.json',
                    '_.appsngenrc'
                ], packageInfo);
            },
            src: function () {
                var metadataXmlTemplateData = {
                    id: this.props.widgetId,
                    name: this.props.widgetName,
                    description: this.props.widgetDescription,
                    includeDataSource: Boolean(this.props.enableDataSourceSupport),
                    includePreferences: Boolean(this.props.enablePreferencesSupport),
                    includeEvents: Boolean(this.props.enableEventsSupport)
                };
                var htmlAndJsTemplateData = {
                    includeQuotesDataSource: Boolean(this.props.enableQuotesSupport),
                    includeTimeSeriesDataSource: Boolean(this.props.enableTimeSeriesSupport),
                    includeNewsDataSource: Boolean(this.props.enableNewsSupport),
                    includeEventBuilder: Boolean(this.props.enableEventsSupport),
                    includeGreeting: Boolean(this.props.enablePreferencesSupport)
                };
                var srcFiles = [
                    'src/js/debug.js',
                    'src/styles',
                    'src/images'
                ];

                htmlAndJsTemplateData.notEmpty = htmlAndJsTemplateData.includeNewsDataSource||
                    htmlAndJsTemplateData.includeEventBuilder || htmlAndJsTemplateData.includeQuotesDataSource ||
                    htmlAndJsTemplateData.includeGreeting || htmlAndJsTemplateData.includeTimeSeriesDataSource;

                if (htmlAndJsTemplateData.notEmpty) {
                    srcFiles = srcFiles.concat([
                        'src/js/base-builder.ui.js'
                    ]);
                }

                if (htmlAndJsTemplateData.includeNewsDataSource ||
                    htmlAndJsTemplateData.includeQuotesDataSource ||
                    htmlAndJsTemplateData.includeTimeSeriesDataSource) {
                    srcFiles = srcFiles.concat([
                        'src/js/data-builder.js',
                        'src/js/data-builder.ui.js',
                        'src/js/waiting-builder.ui.js'
                    ]);

                    if (htmlAndJsTemplateData.includeNewsDataSource) {
                        srcFiles = srcFiles.concat([
                            'src/js/news-builder.ui.js'
                        ]);
                    }
                    if (htmlAndJsTemplateData.includeQuotesDataSource) {
                        srcFiles = srcFiles.concat([
                            'src/js/quotes-builder.ui.js'
                        ]);
                    }
                }

                if (htmlAndJsTemplateData.includeTimeSeriesDataSource) {
                    srcFiles = srcFiles.concat([
                        'src/js/request-builder.js',
                        'src/js/request-builder.ui.js'
                    ]);
                }

                if (htmlAndJsTemplateData.includeGreeting) {
                    srcFiles = srcFiles.concat([
                        'src/js/greeting.js',
                        'src/js/greeting.ui.js'
                    ]);
                }

                if (htmlAndJsTemplateData.includeEventBuilder) {
                    srcFiles = srcFiles.concat([
                        'src/js/event-builder.js',
                        'src/js/event-builder.ui.js'
                    ]);
                }

                copyFiles(this, srcFiles);

                copyTemplates(this, [
                    'src/_application.xml'
                ], metadataXmlTemplateData);

                copyTemplates(this, [
                    'src/_index.html',
                    'src/js/_widget.js'
                ], htmlAndJsTemplateData);

                createDirectories([
                    'src/fonts'
                ]);
            },
            tests: function () {
                copyFiles(this, [
                    'tests'
                ]);
            },
            documentation: function () {
                createDirectories([
                    'documentation'
                ]);
            }
        },
        install: function () {
            this.installDependencies({
                bower: false,
                callback: function () {
                    this.spawnCommand('grunt');
                }.bind(this)
            });
        }
    });
})();
