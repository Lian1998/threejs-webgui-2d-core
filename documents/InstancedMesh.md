```javascript
			const matrix = new THREE.Matrix4();
			const mesh = new THREE.InstancedMesh( geometry, material, api.count );

			for ( let i = 0; i < api.count; i ++ ) {

				randomizeMatrix( matrix );
				mesh.setMatrixAt( i, matrix );

			}


                dummy.position.set( offset - x, offset - y, offset - z );
								dummy.rotation.y = ( Math.sin( x / 4 + time ) + Math.sin( y / 4 + time ) + Math.sin( z / 4 + time ) );
								dummy.rotation.z = dummy.rotation.y * 2;

								dummy.updateMatrix();

								mesh.setMatrixAt( i ++, dummy.matrix );
```