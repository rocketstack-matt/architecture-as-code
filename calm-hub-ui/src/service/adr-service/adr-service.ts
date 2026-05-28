import axios, { AxiosInstance } from 'axios';
import {
    AdrService as BaseAdrService,
    type AuthHeadersProvider,
} from '@finos/calm-hub-client';
import { getAuthHeaders } from '../../authService.js';

const hubAuth: AuthHeadersProvider = { getAuthHeaders };

export class AdrService extends BaseAdrService {
    constructor(axiosInstance?: AxiosInstance) {
        super(axiosInstance ?? axios.create(), hubAuth);
    }
}
