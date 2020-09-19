import numpy as np
import cv2
import sys
import base64


def show(image):
    cv2.imshow('test', image)
    cv2.waitKey(0)
    cv2.destroyAllWindows()


def base64_to_cv2(code):
    nparr = np.frombuffer(base64.b64decode(code), np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return image


head = cv2.imread('pedohead.png', cv2.IMREAD_GRAYSCALE)
mark = cv2.imread('pedomark.png', cv2.IMREAD_GRAYSCALE)
user = base64_to_cv2(sys.stdin.readline())
sift = cv2.SIFT_create()
kp1, des1 = sift.detectAndCompute(head, None)
kp2, des2 = sift.detectAndCompute(mark, None)
kp3, des3 = sift.detectAndCompute(user, None)

index_params = dict(algorithm=0, trees=5)
search_params = dict(checks=50)
flann = cv2.FlannBasedMatcher(index_params, search_params)
matches1 = flann.knnMatch(des1, des3, k=2)
headgood = []
markgood = []
for i, (m, n) in enumerate(matches1):
    if m.distance < 0.7 * n.distance:
        headgood.append(m)

if len(headgood) == 2:
    matches2 = flann.knnMatch(des2, des3, k=2)
    for i, (m, n) in enumerate(matches2):
        if m.distance < 0.7 * n.distance:
            markgood.append(m)
    print(len(markgood))
    sys.stdout.flush()
else:
    print(len(headgood))
    sys.stdout.flush()
