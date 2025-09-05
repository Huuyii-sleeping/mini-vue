# parse实现原理

## 有限状态机

![image-20250720210217027](C:\Users\Lenovo\AppData\Roaming\Typora\typora-user-images\image-20250720210217027.png)

根据输入更改状态

## parse实现

parse 解析过程 状态机的应用

![image-20250720210513688](C:\Users\Lenovo\AppData\Roaming\Typora\typora-user-images\image-20250720210513688.png)

## 有限状态机实现正则

```ts
/abc/.test('')
```

![image-20250720211145323](C:\Users\Lenovo\AppData\Roaming\Typora\typora-user-images\image-20250720211145323.png)

逻辑的实现

```ts
function test(string){
    let startIndex 
    let endIndex
    let i
    let result = []
	function waitingForA(char){
		if(char === 'a'){
            startIndex = i
            return waitingForB
        }
        return waitingForA
	}
	function waitingForB(){
		if(char === 'b'){
            return waitingForC
        }
        return waitingForA
	}
	function waitingForC(){
		if(char === 'C'){
            endIndex = i
            return end
        }
        return waitingForA
	}
    function end(){
     	return end   
    }
	let currentState = waitForA;
	for( i = 0;i < string.length;i++){
		let nextState = currentState(string[i])
        currentState =  nextState
        if(currentState === end){
           console.log(startIndex,endIndex)
           result.push({
               start : startIndex,
               end : endIndex
           })
           currentIndex = waitingForA
        }
	}
    return false
}
```

