class BaseResponse {
        constructor(result, time, data, error) {
                this.result = result;
                this.time = time;
                this.data = data;
                this.error = error;
        }
}
module.exports = BaseResponse;