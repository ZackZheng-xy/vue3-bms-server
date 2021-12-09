/**
 * 部门管理模块
 */
const router = require('koa-router')()
const Leave = require('../models/leaveSchema')
const Dept = require('../models/deptSchema')
const util = require('./../utils/util')
const config = require('../config')
const jwt = require('jsonwebtoken')
const md5 = require('md5')
router.prefix('/leave')
// 查询申请列表
router.post('/list', async (ctx) => {
  const { applyState } = ctx.request.body
  const { page, skipIndex } = util.pager(ctx.request.body)
  let authorization = ctx.request.headers.authorization
  let { data } = util.decoded(authorization)
  try {
    let params = {
      'applyUser.userId': data.userId
    }
    if (applyState) params.applyState = applyState
    const query = Leave.find(params)
    const list = await query.skip(skipIndex).limit(page.pageSize)
    const total = await Leave.countDocuments(params)
    ctx.body = util.success({
      page: {
        ...page,
        total
      },
      list
    })
  } catch (error) {
    ctx.body = util.fail(`查询失败${error.stack}`)
  }
})
router.post('/operate', async (ctx) => {
  const { _id, action, ...params } = ctx.request.body
  let authorization = ctx.request.headers.authorization
  let { data } = util.decoded(authorization)
  if (action === 'create') {
    let orderNo = "XJ"
    orderNo += util.formatDate(new Date(), 'yyyyMMdd')
    const total = await Leave.countDocuments()
    params.orderNo = orderNo + total
    // 获取部门负责人信息
    let id = data.deptId.pop()
    let dept = await Dept.findById(id)
    // 获取人事部门和财务部门
    let userList = await Dept.find({ deptName: { $in: ['人事部门', '财务部门'] } })
    let auditUsers = dept.userName
    let auditFlows = [
      { userId: dept.userId, userName: dept.userName, userEmail: dept.userEmail }
    ]
    userList.map(item => {
      auditFlows.push(
        { userId: item.userId, userName: item.userName, userEmail: item.userEmail }
      )
      auditUsers += ',' + item.userName
    })
    params.auditUsers = auditUsers
    params.curAuditUserName = dept.userName
    params.auditFlows = auditFlows
    params.auditLogs = []
    params.applyUser = {
      userId: data.userId,
      userName: data.userName,
      userEmail: data.userEmail,
    }
    let res = await Leave.create(params)
    ctx.body = util.success(res, '创建成功')
  } else {
    let res = await Leave.findByIdAndUpdate(_id, { applyState: 5 })
    ctx.body = util.success(res, '作废成功')
  }
})
module.exports = router