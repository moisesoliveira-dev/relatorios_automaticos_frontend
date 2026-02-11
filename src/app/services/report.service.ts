import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface GenerateReportRequest {
    email: string;
    password: string;
    destinationEmail: string;
    status?: string;
}

export interface DownloadReportRequest {
    email: string;
    password: string;
    status?: string;
}

export interface ReportResponse {
    success: boolean;
    message: string;
    totalRecords: number;
    sentTo: string;
    generatedAt: string;
}

export interface PreviewResponse {
    success: boolean;
    totalPreview: number;
    data: any[];
    generatedAt: string;
}

@Injectable({
    providedIn: 'root'
})
export class ReportService {
    private readonly apiUrl = 'http://localhost:3000/report';

    constructor(private http: HttpClient) { }

    generateAndSendReport(request: GenerateReportRequest): Observable<ReportResponse> {
        return this.http.post<ReportResponse>(`${this.apiUrl}/generate-and-send`, request);
    }

    downloadReport(request: DownloadReportRequest): Observable<Blob> {
        return this.http.post(`${this.apiUrl}/download`, request, {
            responseType: 'blob'
        });
    }

    downloadExcel(request: DownloadReportRequest): Observable<Blob> {
        return this.http.post(`${this.apiUrl}/download-excel`, request, {
            responseType: 'blob'
        });
    }

    previewReport(request: DownloadReportRequest): Observable<PreviewResponse> {
        return this.http.post<PreviewResponse>(`${this.apiUrl}/preview`, request);
    }

    healthCheck(): Observable<any> {
        return this.http.get(`${this.apiUrl}/health`);
    }
}
