import { Component, ElementRef, ViewChild } from '@angular/core';
import { BehaviorSubject, finalize, map, takeWhile, timer } from 'rxjs';
import {
  HttpClient,
  HttpParams,
  HttpRequest,
  HttpHeaders,
} from '@angular/common/http';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  public videoElement!: HTMLVideoElement;
  public recordVideoElement!: HTMLVideoElement;
  public mediaVideoRecorder: any;
  public videoRecordedBlobs!: Blob[];
  public isRecording: boolean = false;
  public downloadVideoUrl!: string;
  public stream!: MediaStream;
  public countDown$: any;
  public secondsLeft!: number;
  public showPreview = new BehaviorSubject(false);
  private apiUrl = 'http://localhost:8000/upload';
  public apiResponse!: any;
  public errorRespone!: any;

  @ViewChild('liveVideo') videoElementRef!: ElementRef;
  @ViewChild('recordedVideo', { static: false }) set recordVideoElementRef(
    content: ElementRef
  ) {
    if (content) {
      this.recordVideoElement = content.nativeElement;
    }
  }

  constructor(private http: HttpClient) {}

  startTimer() {
    this.countDown$ = timer(0, 1000)
      .pipe(
        // take(1000),
        takeWhile((x) => x <= 5),
        map((secondsElapsed) => 5 - secondsElapsed),
        finalize(() => {
          this.stopVideoRecording();
        })
      )
      .subscribe((t) => (this.secondsLeft = t));
  }

  async ngOnInit() {
    await this.initRecorder();
  }

  async initRecorder() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 480 },
    });
    this.videoElement = this.videoElementRef.nativeElement;
    this.stream = stream;
    this.videoElement.srcObject = this.stream;
  }

  startVideoRecording() {
    this.showPreview.next(false);
    this.startTimer();
    this.initRecorder();
    this.videoRecordedBlobs = [];
    let options: any = {
      mimeType: 'video/webm',
    };
    try {
      this.mediaVideoRecorder = new MediaRecorder(this.stream, options);
    } catch (err) {
      console.log(err);
    }
    this.mediaVideoRecorder.start();
    this.isRecording = !this.isRecording;
    this.onDataAvailableVideoEvent();
    this.onStopVideoRecordingEvent();
  }

  stopVideoRecording() {
    this.showPreview.next(true);
    this.mediaVideoRecorder.stop();
    this.isRecording = !this.isRecording;
  }

  playRecording() {
    if (!this.videoRecordedBlobs || !this.videoRecordedBlobs.length) {
      return;
    }
    this.recordVideoElement.play();
  }

  onDataAvailableVideoEvent() {
    try {
      this.mediaVideoRecorder.ondataavailable = (event: any) => {
        if (event.data && event.data.size > 0) {
          console.log(event.data);
          this.videoRecordedBlobs.push(event.data);
        }
      };
    } catch (error) {
      console.log(error);
    }
  }

  onStopVideoRecordingEvent() {
    try {
      this.mediaVideoRecorder.onstop = (event: Event) => {
        const videoBuffer = new Blob(this.videoRecordedBlobs, {
          type: 'video/mp4',
        });
        console.log({ videoBuffer });
        this.downloadVideoUrl = window.URL.createObjectURL(videoBuffer);
        this.recordVideoElement.src = this.downloadVideoUrl;
        this.uploadVideo(this.videoRecordedBlobs).subscribe((res: any) => {
          console.log(res);
          this.apiResponse = res.response;
        });
      };
    } catch (error) {
      console.log(error);
    }
  }

  uploadVideo(blob: any) {
    const instructions = 'smile, blink_eyes';
    const formData = new FormData();
    formData.append('video', blob);
    formData.append('instructions', instructions);

    const headers = new HttpHeaders();
    headers.append('Content-Type', 'multipart/form-data');

    return this.http.post(this.apiUrl, formData, {
      headers,
    });
  }
}
