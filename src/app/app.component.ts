import { Component, ElementRef, ViewChild } from '@angular/core';
import { BehaviorSubject, finalize, map, takeWhile, timer } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { v4 as uuid } from 'uuid'

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  public videoElement!: HTMLVideoElement;
  public recordedVideoElement!: HTMLVideoElement;
  public canvas!: HTMLCanvasElement;
  public capturedImage!: HTMLImageElement;
  public mediaVideoRecorder: any;
  public recordedChunks!: Blob[];
  public stream!: MediaStream;
  public isRecording: boolean = false;
  public downloadVideoUrl!: string;
  public countDown$: any;
  public secondsLeft!: number;
  public showPreview$ = new BehaviorSubject(false);
  private width = 480;

  private apiUrl = 'http://172.16.4.134:8080/process_video/';

  @ViewChild('liveVideo') videoElementRef!: ElementRef;
  @ViewChild('recordedVideo', { static: false }) set recordVideoElementRef(
    content: ElementRef
  ) {
    if (content) {
      this.recordedVideoElement = content.nativeElement;
    }
  }
  @ViewChild('canvas') canvasRef!: ElementRef;
  @ViewChild('capturedImage', {static : false}) set capturedImageRef(content: ElementRef){
    if(content){
      this.capturedImage = content.nativeElement;
    }
  };

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
    this.loadCanvas();
  }

  async initRecorder() {
    const constraints = {
      video: { width : this.width },
      audio: false
    }
    try{
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.videoElement = this.videoElementRef.nativeElement;
      this.stream = stream;
      this.videoElement.srcObject = this.stream;
    }catch(error){
      this.handelMediaRejectionError(error)
    }
  }

  loadCanvas(){
    this.canvas = this.canvasRef.nativeElement;
    // this.captureImage = this.capturedImageRef.nativeElement;
    this.clearImage();
  }

  startVideoRecording() {
    this.showPreview$.next(false);
    this.clearImage();
    this.startTimer();
    this.initRecorder();
    this.recordedChunks = [];
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
    this.showPreview$.next(true);
    this.mediaVideoRecorder.stop();
    this.isRecording = !this.isRecording;
  }


  onDataAvailableVideoEvent() {
    try {
      this.mediaVideoRecorder.ondataavailable = (event: any) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };
    } catch (error) {
      console.log(error);
    }
  }


  onStopVideoRecordingEvent() {
    try {
      this.mediaVideoRecorder.onstop = (event: Event) => {
        const videoBuffer = new Blob(this.recordedChunks, {
          type: 'video/mp4',
        });
        this.downloadVideoUrl = window.URL.createObjectURL(videoBuffer);
        this.recordedVideoElement.src = this.downloadVideoUrl;
        // this.uploadVideo(videoBuffer).subscribe((res: any) => {
        //   console.log(res);
        // });
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

    const headers = new HttpHeaders({
      "uid": uuid()
    });

    return this.http.post(this.apiUrl, formData, {
      headers,
    });
  }


  clearImage(){
    const context = this.canvas.getContext('2d');
    if(context){
      context.fillStyle = "#fff"
      context.fillRect(0, 0, this.canvas.width, this.canvas.height);
      const data = this.canvas.toDataURL("image/png");
      this.capturedImage.setAttribute("src", data);
    }
  }


  takeSnapshot(){
    if(this.recordedVideoElement.duration > 0){
      let context;
      let width = this.width, height = this.recordedVideoElement.offsetHeight;
      this.canvas.width = width;
      this.canvas.height = height;
      context = this.canvas.getContext("2d")!;
        context.drawImage
        context.drawImage(this.recordedVideoElement, 0, 0, width, height);
        let data = this.canvas.toDataURL('image/png')
        this.capturedImage.setAttribute("src", data);
    }else{
      this.clearImage();
    }

  }


  handelMediaRejectionError(err: any){
    if (err.name == "NotFoundError" || err.name == "DevicesNotFoundError") {
        //required track is missing
        alert('Webcam not found') 
    } else if (err.name == "NotReadableError" || err.name == "TrackStartError") {
        //webcam or mic are already in use
        alert('Webcam or mic are already in user') 
    } else if (err.name == "OverconstrainedError" || err.name == "ConstraintNotSatisfiedError") {
        //constraints can not be satisfied by avb. devices
        alert('Unable to record video') 
    } else if (err.name == "NotAllowedError" || err.name == "PermissionDeniedError") {
        //permission denied in browser
        alert('Permission denied for accessing device media') 
    } else if (err.name == "TypeError" || err.name == "TypeError") {
        //empty constraints object
        alert('Unable to access media devices')
    } 
  }
}
