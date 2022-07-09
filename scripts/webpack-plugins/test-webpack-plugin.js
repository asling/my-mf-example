class TestWebpackPlugin {
    constructor(params) {
        console.log('111',params);
    }
    apply() {
        console.log('apply');
    }

}

module.exports = TestWebpackPlugin;
