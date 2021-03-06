TESTS = test/**/*.spec.js
INSTANCE_TESTS_DIR = .test-instance
INSTANCE_TESTS = test-app/**/*.spec.js
REPORTER = spec
COVERAGE_REPORT = ./coverage/lcov.info
COVERALLS = ./node_modules/coveralls/bin/coveralls.js

test: test-mocha

test-mocha:
	@NODE_ENV=test mocha \
		--timeout 200 \
		--reporter $(REPORTER) \
		$(TESTS)

test-full: istanbul create-app-instance test-app-instance test-node-module

istanbul:
	istanbul cover _mocha -- -R spec $(TESTS)

coveralls:
	cat $(COVERAGE_REPORT) | $(COVERALLS)

cov-html: test-cov html-cov-report

html-cov-report:
	istanbul report html

npm:
	npm publish ./

check:
	travis-lint .travis.yml

clean:
	rm -rf ./coverage

test-app-instance:
	istanbul cover _mocha -- -R spec $(INSTANCE_TESTS)

create-app-instance:
	rm -rf $(INSTANCE_TESTS_DIR)/
	mkdir $(INSTANCE_TESTS_DIR)
	npm install -g yo bower node-gyp
	npm link
	cd $(INSTANCE_TESTS_DIR) && echo "CDing into $(INSTANCE_TESTS_DIR)" && \
	yo moda --skip-install --skipPrompts && \
	npm install && \
	bower install

test-node-module:
	rm -rf $(INSTANCE_TESTS_DIR)/
	mkdir $(INSTANCE_TESTS_DIR)
	npm install -g yo bower generator-moda node-gyp
	cd $(INSTANCE_TESTS_DIR) && echo "CDing into $(INSTANCE_TESTS_DIR)" && \
	yo moda --skipPrompts --skip-install && \
	npm cache clean && \
	npm install && \
	bower install && \
	gulp injectAll && \
	yo moda:r hello-route --useDefaults && \
	yo moda:d hello-directive --useDefaults && \
	yo moda:s hello-service --useDefaults && \
	gulp testSingle && \
	gulp build