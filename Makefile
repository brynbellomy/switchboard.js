
all: clean build build-tests

build: index.js

clean:
	@rm ./index.js
	@rm ./test/test.js

index.js:
	@coffee -c -o . src/index.coffee

build-tests: test/test.js

test/test.js:
	@coffee -c -o ./test ./src/test.coffee