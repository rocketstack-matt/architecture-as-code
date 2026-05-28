import axios, { AxiosInstance } from 'axios';
import {
    ControlService as BaseControlService,
    type AuthHeadersProvider,
} from '@finos/calm-hub-client';
import { getAuthHeaders } from '../authService.js';

const hubAuth: AuthHeadersProvider = { getAuthHeaders };

export class ControlService extends BaseControlService {
    constructor(axiosInstance?: AxiosInstance) {
        super(axiosInstance ?? axios.create(), hubAuth);
    }
}
